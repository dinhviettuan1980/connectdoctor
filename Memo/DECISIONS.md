# DECISIONS.md

> Mọi quyết định kỹ thuật quan trọng. Format: ngày, quyết định, lý do, trade-offs.

---

### 2026-06-29 — Chuyển OCR từ Gemini/mock sang Groq vision

**Quyết định:** `lib/ocr.ts` dùng Groq vision API để nhận dạng đơn thuốc & chỉ số xét nghiệm từ ảnh,
thay cho Gemini/mock trước đó. (commit `1703993`)

**Lý do:** không ghi lại trong commit message — suy đoán hợp lý là tốc độ/chi phí/độ chính xác OCR của
Groq vision tốt hơn cho use-case này. **Cần hỏi lại người quyết định nếu cần lý do chính xác.**

**Trade-offs:** thêm 1 API key/provider mới cần quản lý (`EXPO_PUBLIC_*`, cùng vấn đề lộ key như Gemini —
xem `TODO.md`). Mất khả năng dùng chung 1 provider (Gemini) cho cả triage lẫn OCR.

---

### 2026-05-29 — Chuyển Google/Facebook sign-in trên web từ popup sang redirect

**Quyết định:** `signInWithPopup` → redirect flow cho web. (commit `87c4b83`)

**Lý do:** popup bị trình duyệt chặn (popup blocker) trong nhiều trường hợp thực tế, gây lỗi đăng nhập
không nhất quán.

**Trade-offs:** redirect flow phức tạp hơn để xử lý (cần bắt kết quả sau khi quay lại trang), UX có
chuyển trang thay vì popup mượt.

---

### 2026-05-20 → 2026-06-03 — Tách code native-only ra file `.native.ts`/`.web.ts` riêng

**Quyết định:** notifications (`5/20`), locationTracking (`5/29`), voiceNav (`6/3`) — và về sau health,
ble, FamilyMap, HealthMap, VideoCallModal, WebPortal, HomeAddressPicker — đều tách thành file platform
riêng thay vì 1 file dùng `Platform.OS` check.

**Lý do:** các thư viện native-only (`expo-notifications`, `expo-speech`, background location, BLE) khi
import vào 1 file dùng chung sẽ bị Metro bundler kéo vào bundle web dù không cần, làm bundle web nặng hơn
và có thể crash (module không tồn tại trên web).

**Trade-offs:** trùng lặp code giữa các file platform (không tránh được nếu muốn tree-shaking đúng qua
tên file); phải nhớ cập nhật cả `.native.ts` lẫn `.web.ts`/base khi sửa logic chung.

---

### 2026-05-20 — Auth persistence: AsyncStorage (native) vs IndexedDB (web)

**Quyết định:** `lib/firebase.ts` wire persistence khác nhau theo platform ngay từ đầu (không phải quyết
định giữa chừng, nằm trong scaffold ban đầu — xem `README.md`/`CLAUDE.md`).

**Lý do:** Firebase Auth JS SDK không tự động chọn đúng storage cho React Native; cần chỉ định rõ.

**Trade-offs:** không có, đây là yêu cầu bắt buộc kỹ thuật chứ không phải lựa chọn có phương án khác.

---

### 2026-06-05 (khoảng) — Xây hệ thống agent automation nội bộ (`tasks`/`repos` Firestore + scripts)

**Quyết định:** dùng chính Firestore của app này làm hàng đợi việc cho Claude Code agent
(`scripts/agent-tasks.mjs`), thay vì một hệ thống ticket riêng (Linear/Jira/GitHub Issues).

**Lý do:** tận dụng hạ tầng Firebase có sẵn, không cần thêm dependency ngoài; cho phép UI admin
(`app/(patient)/tasks.tsx`) quản lý trực tiếp trong chính app.

**Trade-offs:** hệ thống này gắn chặt vào 1 project Firebase cụ thể của ConnectDoctor dù về bản chất là
công cụ DevOps đa repo (multi-repo support) — nếu tách ra dùng cho project khác sẽ cần refactor khỏi
Firestore của app này.

---

### 2026-05-20 — Chọn Groq/Gemini (external AI API) thay vì on-device ML cho AI triage & OCR

**Quyết định:** dùng Gemini cho triage, Groq vision cho OCR — cả hai đều gọi API ngoài, có fallback mock
khi thiếu key (không phải on-device inference).

**Lý do:** on-device ML (vd. ML Kit) chỉ tốt cho OCR text thô, không đủ để suy luận triage hay trích xuất
dữ liệu có cấu trúc (tên thuốc/liều lượng) — cần LLM.

**Trade-offs:** phụ thuộc mạng + chi phí API + vấn đề lộ key phía client (xem `TODO.md`). Đã cân nhắc
ML Kit làm fallback offline nhưng chưa triển khai (low priority trong `TODO.md`).
