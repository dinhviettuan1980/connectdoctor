# CURRENT_STATUS.md

> Trạng thái thực tế mới nhất. Cập nhật file này sau mỗi task/milestone lớn.

**Cập nhật lần cuối:** 2026-07-03
**Branch:** `master`, đồng bộ với `origin/master`, đã deploy lên production
(`connectdoctor.tuandv.id.vn`, xem `ARCHITECTURE.md` → "Hạ tầng production"). HEAD của `connectdoctor`
không đổi so với hôm qua (`ddfa5c9`) — thay đổi hôm nay nằm ở backend riêng `doctorapi` (repo khác), xem
bên dưới.

## Việc mới nhất (2026-07-03): migrate `doctorapi` sang NestJS + Fastify (Phase 1/3)

- Theo kế hoạch tách 3 backend (`doctorapi`/`kinhdichapi`/`xsmbapi`) sang NestJS — xem `DECISIONS.md`.
- **`doctorapi` đã viết lại xong bằng NestJS + Fastify + TypeScript, đã cutover production.** Cùng
  contract/route/env vars như bản Express cũ (đã verify từng endpoint qua `curl` cả local lẫn qua domain
  thật `doctorapi.tuandv.id.vn` sau khi đổi nginx) — `connectdoctor` **không cần đổi gì** phía app.
  - pm2 process mới `doctorapi-nest` (port 8032) — nginx đã trỏ hẳn sang đây.
  - pm2 process cũ `doctorapi` (port 8022, Express) **vẫn giữ chạy** làm rollback window ~1 tuần, không
    nhận traffic nữa (đừng ngạc nhiên nếu thấy 2 process cùng tên gần giống nhau trên `pm2 list`).
  - Chi tiết kiến trúc mới ở `ARCHITECTURE.md` → mục backend `doctorapi`.
- **Chưa làm**: Phase 2 (`kinhdichapi`) và Phase 3 (`xsmbapi`) — chờ user xác nhận tiếp sau khi Phase 1
  chạy ổn định.

## Đang làm gì

Chuỗi việc trong ngày 2026-07-02, tất cả đã commit, push, và deploy lên production:

1. **Presence / trạng thái online trong chat** — commit `e2e0161`. `hooks/useOnlineStatus.ts` (mới) +
   wiring vào 4 màn chat/messages. **Chưa được user xác nhận đã test trên UI thật.**
2. **Structured meds editor** — commit `1b8df52`. `MedsEditor` trong `profile.tsx` cho sửa từng thuốc
   (tên/liều/nhóm) có cấu trúc; fallback hiển thị `note` cho đơn cũ.
3. **Fix bug production: upload ảnh trả về URL nội bộ không dùng được** — commit `1e665bc` (nginx) +
   `e1b30be` (code). Root cause + fix chi tiết ở `BUGS.md`. **Đã user xác nhận ảnh hiện đúng sau fix.**
4. **Auto-OCR khi thêm ảnh trong màn sửa đơn thuốc thủ công** — commit `e421563` → `422a6b2` (banner
   inline) → `5057c0a` (surface lỗi thật thay vì message chung chung) → `8363d76` (root cause thật: OCR
   chạy thành công nhưng `updateDoc()` throw vì field `category: undefined` — Firestore từ chối
   `undefined` ở bất kỳ đâu; fix bằng `sanitizeMeds()` trong `lib/prescriptions.ts`, áp dụng cho cả 3
   luồng lưu thuốc). Chi tiết ở `BUGS.md`. **Chưa được user xác nhận đã test lại sau bản fix cuối.**
5. **Fix bug hệ thống: `Alert.alert`/`Alert.prompt` không hoạt động trên web (và `prompt` crash trên
   Android)** — commit `7dd9523`. Thêm `lib/alert.ts`, đổi import ở 9 file. Root cause + phạm vi chi tiết
   ở `BUGS.md`. **Chưa được user xác nhận đã test trên UI thật** (đặc biệt các nút xoá — "Xoá đơn thuốc
   này", "Xoá liên hệ", "Giải tán nhóm", v.v. — trước đây không hoạt động gì trên web).
6. **Redesign: thêm ảnh đơn thuốc giờ "staged" cục bộ, chỉ ghi Firestore khi bấm "Lưu"** — commit
   `d1daf4b`. User phản hồi: trước đó không thấy nút Save vì ảnh + thuốc AI đã tự ghi Firestore ngay,
   không còn gì "dirty" để hiện nút lưu. Giờ: chọn/chụp ảnh → chỉ giữ URI cục bộ + chạy OCR gộp vào bản
   nháp `editableMeds` (state trong `MedsTab`, KHÔNG ghi Firestore) → nút "💾 Lưu" xuất hiện khi có ảnh
   đang chờ hoặc danh sách thuốc khác với bản đã lưu → bấm mới upload ảnh + `updatePrescriptionMeds` cùng
   lúc. `MedsEditor` đổi thành controlled component (`meds`+`onChange`, không còn state/nút lưu riêng bên
   trong). Đóng modal khi có thay đổi chưa lưu giờ hỏi xác nhận trước khi mất dữ liệu. **Chưa được user
   xác nhận đã test trên UI thật.**
7. **Lịch nhắc uống thuốc: giới hạn còn đúng 3 buổi Sáng/Chiều/Tối** — commit `a6889f6`. Trước đó
   "Tên gợi nhớ" là free-text; giờ thay bằng `Segmented` chọn cố định 1 trong 3 buổi (`RemindersTab` trong
   `profile.tsx`), chọn buổi tự set giờ mặc định (Sáng 7h / Chiều 12h / Tối 19h) để người dùng chỉnh lại
   cho đúng. Thêm mới tự chọn buổi chưa dùng. Lịch nhắc cũ có label tự do (trước khi đổi) vẫn hiển thị
   bình thường, chỉ không có buổi nào được highlight sẵn khi mở Sửa. **Chưa được user xác nhận đã test
   trên UI thật.**
8. **Phân tích đơn thuốc mới nhất → gửi test lịch nhắc qua Telegram** — commit `e550daa`. Khi bấm "Lưu"
   trên đơn thuốc MỚI NHẤT (đơn cũ bị bỏ qua), `detectMealTimes()` đọc câu chữ liều dùng của từng thuốc
   (từ khoá sáng/trưa/chiều/tối, hoặc suy từ "N lần/ngày" nếu không có từ khoá) → gộp thành thông báo theo
   3 buổi Sáng/Chiều/Tối → gọi `notify()` (`lib/notify.ts`) gửi qua backend `/notify`. **Chưa tự tạo lịch
   nhắc thật (`MedicationSchedule`)** — đây chỉ là bước test theo yêu cầu, xem `TODO.md`.
   **Update cùng ngày:** lúc đầu chẩn đoán sai là "AWS chặn Telegram" — user chỉ ra bot xổ số vẫn gửi
   Telegram hàng ngày từ chính server này nên không thể do mạng. Root cause thật (lần 1):
   `~/xsmbapi/telegram.js` dùng thư viện `node-telegram-bot-api` bị lỗi HTTP client nội bộ trên Node 20.
   Đã đổi sang `fetch()` thuần — verify thành công lúc đó, nhưng **hoá ra chỉ là trùng hợp may mắn** (xem
   mục 11 bên dưới — root cause thật sự sâu hơn, là race IPv6/IPv4 của chính `fetch()`).

9. **Tách backend ConnectDoctor ra repo/service riêng `doctorapi`** (yêu cầu user, không phải bugfix) —
   xem `DECISIONS.md` + `ARCHITECTURE.md` → "Hạ tầng production" để biết chi tiết đầy đủ. Tóm tắt: file
   upload (đơn thuốc/avatar/audio) + `/notify` không còn dùng chung code với `xsmbapi` (app xổ số không
   liên quan) nữa — chuyển sang repo `dinhviettuan1980/doctorapi`, deploy trên cùng VPS
   (`doctorapi.tuandv.id.vn`, pm2 port 8022, SSL qua certbot). Đã migrate dữ liệu cũ (9.8MB đơn thuốc,
   583MB audio knowledge) sang server mới; `connectdoctor`'s `EXPO_PUBLIC_STORAGE_URL` và `lib/notify.ts`
   đã trỏ sang domain mới (commit `bffd8ca`). URL cũ (trước ngày này) vẫn hoạt động vì `xsmbapi`'s
   storage-router giữ nguyên, không xoá. **Chưa được user xác nhận đã test trên UI thật.**
   Nhân tiện cũng dựng subdomain `kinhdichapi.tuandv.id.vn` (SSL riêng) cho service `kinhdichapi` đã có
   sẵn từ trước (trước đó chỉ chạy qua path `kinhdich.tuandv.id.vn/kinhdich`) — user tự thêm DNS record.
10. **Đổi phân loại buổi uống thuốc (Sáng/Chiều/Tối) từ keyword sang AI thật (Groq)** — user hỏi lại và
    phát hiện bước phân loại trước đó chỉ là keyword-matching, không phải AI như tưởng. Thêm
    `POST /classify-meds` vào `doctorapi` (Groq `llama-3.1-8b-instant`), `app/(patient)/profile.tsx` gọi
    qua `classifyMedTimes()` (`lib/notify.ts`), fallback về keyword cũ nếu AI lỗi. Xem `DECISIONS.md`.
11. **Root cause thật của lỗi Telegram: `fetch()`/undici race IPv6/IPv4 và thua, không phải thư viện hay
    proxy** — phát hiện khi build `/notify` cho `doctorapi` và thấy `fetch()` timeout **nhất quán** dù
    cùng cách gọi đã "fix" cho `xsmbapi` lúc trước. `curl`/`https.request` với `family: 4` ép cứng đều
    thành công ngay trên cùng IP. Đã sửa cả `doctorapi/telegram.js` VÀ `xsmbapi/telegram.js` dùng module
    `https` + `family: 4` thay vì `fetch()`. Verify: gọi `/notify` lặp lại nhiều lần đều `telegram:true`.
    Chi tiết đầy đủ ở `BUGS.md` — bài học: đừng tin 1 lần test thành công với lỗi mạng ngẫu nhiên.
12. **Lịch nhắc thuốc giờ là thật, không còn chỉ "test qua Telegram"** — commit `b22968c`. Bấm "Lưu" trên
    đơn thuốc mới nhất giờ: xoá hết `MedicationSchedule` cũ → tạo lại đúng các buổi Sáng/Chiều/Tối có
    thuốc (giờ mặc định 7h/12h/19h, gắn `prescriptionId`) qua `addSchedule`/`deleteSchedule`
    (`lib/medicationSchedules.ts`, đã tự lo cả việc đặt/huỷ local notification). Vẫn gửi Telegram xác
    nhận song song (không còn ghi "(test)" trong tiêu đề nữa). Thêm `getSchedulesOnce()` cho việc đọc rồi
    xoá hàng loạt.
13. **Bỏ nút "+ Thêm giờ uống thuốc" thủ công** — commit `1069222`, theo yêu cầu user vì lịch nhắc giờ tự
    sinh từ đơn thuốc (mục 12). Tab "Nhắc nhở" giờ chỉ còn Sửa (giờ/phút/bật-tắt) và Xoá cho lịch đã có,
    không tạo mới thủ công được nữa.
14. **Nội dung nhắc nhở giờ liệt kê đúng tên thuốc, không chỉ nói buổi** — commit `780090a`. User phản hồi
    thông báo trước đó chỉ nói "Sáng"/"Chiều"/"Tối" mà không nói uống thuốc gì. Thêm field `meds?:
    string[]` vào `MedicationSchedule`, `scheduleMedicationReminder` (`lib/notifications.native.ts`) build
    nội dung push notification kiểu `"Sáng: Paracetamol, Vitamin D — còn 5 phút nữa..."`. Cũng hiện danh
    sách thuốc trực tiếp trên card ở tab "Nhắc nhở" (💊 ...).
    **Lưu ý:** push notification thật (`expo-notifications`) chỉ chạy trên **native** (iOS/Android) —
    `lib/notifications.ts` (bản web) vẫn là no-op stub như từ trước. Trên web chỉ thấy danh sách thuốc
    qua card trong tab Nhắc nhở, không có push notification thật.
    **Cả mục 12/13/14 chưa được user xác nhận đã test trên UI thật** (đặc biệt mục 14 cần test trên máy
    thật/simulator native mới thấy nội dung push, không test được qua web).
15. **Dọn 2 nút thừa ở tab Đơn thuốc** — commit `ddfa5c9`. Bỏ nút "🤖 Đọc đơn thuốc từ ảnh (AI)" (thừa vì
    editor thủ công đã tự OCR khi thêm ảnh — xem mục redesign trước đó) và nút "Xoá đơn thuốc này" trong
    modal chi tiết (thừa vì đã có link "Xoá" ở mỗi dòng trong danh sách, vẫn giữ nguyên). Route
    `ocr/upload.tsx?kind=meds` không bị xoá khỏi codebase — vẫn còn dùng gián tiếp qua `kind=metrics` cho
    tab Chỉ số.

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

- User cần test trên UI thật: presence "đang online", auto-OCR đơn thuốc, nút xoá/xác nhận sau fix
  `Alert`, và **quan trọng nhất — toàn bộ luồng upload ảnh/avatar/audio qua backend `doctorapi` mới**
  (domain hoàn toàn khác so với trước, rủi ro cao nhất nếu có sai sót cấu hình).
- Setup credential git cho server pull được `xsmbapi` + `doctorapi` (2 repo private) — hiện đang deploy
  thủ công qua `scp` (xem `TODO.md`).
- Ảnh/audio đã upload **trước** commit `e1b30be` (2026-07-02) vẫn có URL `localhost:8001` hỏng trong
  Firestore — cần xoá và thêm lại thủ công, không tự khắc phục (xem `BUGS.md`).
- Audit các site nginx khác trên VPS xem có thiếu `client_max_body_size` không (`doctorapi` đã có sẵn từ
  đầu, xem `TODO.md`).
- Chuyển API call Gemini ra Cloud Functions để giấu key trước khi lên production (xem
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
