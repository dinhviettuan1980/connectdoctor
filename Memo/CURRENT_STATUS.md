# CURRENT_STATUS.md

> Trạng thái thực tế mới nhất. Cập nhật file này sau mỗi task/milestone lớn.

**Cập nhật lần cuối:** 2026-07-02
**Branch:** `master`, đồng bộ với `origin/master`, đã deploy lên production
(`connectdoctor.tuandv.id.vn`, xem `ARCHITECTURE.md` → "Hạ tầng production").
**HEAD:** `7dd9523` — fix(alert): add cross-platform Alert shim, fix no-op-on-web everywhere

## Đang làm gì

Chuỗi việc trong ngày 2026-07-02, tất cả đã commit, push, và deploy lên production:

1. **Presence / trạng thái online trong chat** — commit `e2e0161`. `hooks/useOnlineStatus.ts` (mới) +
   wiring vào 4 màn chat/messages. **Chưa được user xác nhận đã test trên UI thật.**
2. **Structured meds editor** — commit `1b8df52`. `MedsEditor` trong `profile.tsx` cho sửa từng thuốc
   (tên/liều/nhóm) có cấu trúc; fallback hiển thị `note` cho đơn cũ.
3. **Fix bug production: upload ảnh trả về URL nội bộ không dùng được** — commit `1e665bc` (nginx) +
   `e1b30be` (code). Root cause + fix chi tiết ở `BUGS.md`. **Đã user xác nhận ảnh hiện đúng sau fix.**
4. **Auto-OCR khi thêm ảnh trong màn sửa đơn thuốc thủ công** — commit `e421563`, feedback UI sửa lại ở
   commit `422a6b2` (banner inline thay vì `Alert.alert`, xem mục 5). Mỗi ảnh thêm vào trong
   `Hồ sơ → Đơn thuốc → mở 1 đơn` giờ tự chạy `extractMedsFromImage` và gộp kết quả vào danh sách thuốc,
   dùng lại `MedsEditor`/nút "Lưu danh sách thuốc" đã có sẵn. **Chưa được user xác nhận đã test trên UI
   thật sau bản fix banner.**
5. **Fix bug hệ thống: `Alert.alert`/`Alert.prompt` không hoạt động trên web (và `prompt` crash trên
   Android)** — commit `7dd9523`. Thêm `lib/alert.ts`, đổi import ở 9 file. Root cause + phạm vi chi tiết
   ở `BUGS.md`. **Chưa được user xác nhận đã test trên UI thật** (đặc biệt các nút xoá — "Xoá đơn thuốc
   này", "Xoá liên hệ", "Giải tán nhóm", v.v. — trước đây không hoạt động gì trên web).

## Đã hoàn thành gần đây (từ git log, mới → cũ)

- OCR bằng Groq vision thay Gemini/mock cho đơn thuốc & chỉ số XN, review có thể sửa và Save lưu thật.
- Task system: multi-repo support, metrics OCR, scheduled task pickup cho agent.
- Task cards hiển thị live progress của agent; sửa UI nút OK ở trạng thái waiting.
- Hệ thống thông báo: post-commit hook gửi Telegram + email khi agent hoàn thành task hoặc có commit mới.
- Admin task management UI (`tasks.tsx`) + agent workflow qua `scripts/agent-tasks.mjs`.
- Voice chat + màn `weekday-stats` (chi tiết 8 tuần).
- Family: family groups (chat nhóm nhiều thành viên, video call, chia sẻ vị trí), family map, family
  chat, home address picker + "Chỉ đường về nhà".
- Health dashboard: Garmin watch (BLE) — nhịp tim, số bước (loại trừ giờ ngủ 20h–7h), dark-mode dashboard.
- GPS: theo dõi vị trí nền (background), bản đồ hiển thị vị trí hiện tại tức thời (last-known position).
- Nhắc uống thuốc qua local notifications.
- Auth: chuyển Google/Facebook web sign-in từ popup sang redirect (popup bị chặn ở một số trình duyệt).

## Task đang mở

- User cần test trên UI thật: presence "đang online" trong chat, auto-OCR khi thêm ảnh vào đơn thuốc
  thủ công, và các nút xoá/xác nhận trên web sau fix `Alert` (mục 1, 4, 5 ở trên).
- Ảnh/audio đã upload **trước** commit `e1b30be` (2026-07-02) vẫn có URL `localhost:8001` hỏng trong
  Firestore — cần xoá và thêm lại thủ công, không tự khắc phục (xem `BUGS.md`).
- Audit các site nginx khác trên VPS xem có thiếu `client_max_body_size` như `api.tuandv.id.vn` không
  (xem `TODO.md`).
- Chuyển API call Gemini/Groq ra Cloud Functions để giấu key trước khi lên production (xem
  `PROJECT_OVERVIEW.md` → ràng buộc, và `TODO.md`).

## Task bị block

- Không có task nào được ghi nhận là "blocked" chính thức tại thời điểm viết file này.

## Phiên bản hiện tại / tiến độ release

- `package.json` version: `0.1.0` — chưa có bản build production chính thức nào được ghi nhận trong repo
  (không thấy CHANGELOG hay tag release). Coi là **giai đoạn phát triển tích cực, chưa release**.
- README.md mô tả "TODOs còn lại (intentional)" cho một số phần backend. Đã wire thật: chat (Firestore
  `chatThreads`/`messages` qua `lib/chat.ts`), OCR (Groq vision qua `lib/ocr.ts`), history. **Vẫn còn
  mock**: `lib/mockDoctors.ts` (`getMockDoctor`) vẫn được dùng trong
  `app/(patient)/chat/[doctorId].tsx` và `chat/doctor/[doctorId].tsx` thay vì query thật từ
  `doctorProfiles` — xem `TODO.md`. README nhìn chung đã lỗi thời, đừng dùng để đánh giá tiến độ, dùng
  file này thay thế.
