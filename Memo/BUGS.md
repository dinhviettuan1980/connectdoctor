# BUGS.md

> Bug đã phát hiện, nguyên nhân, cách sửa, workaround, và bug còn tồn tại.
> Không copy full log/stack trace vào đây — chỉ tóm tắt nguyên nhân + fix.

## Bug đã sửa (đáng nhớ — có thể tái diễn nếu không cẩn thận)

### Metro bundler chậm/hang trên Windows vì `functions/` và `expo-notifications`
- **Triệu chứng:** Metro start rất chậm hoặc hang trên Windows.
- **Nguyên nhân:** (1) `functions/node_modules` bị Metro watcher quét vào; (2) `expo-notifications` gây
  hang khi bundle; (3) regex blockList dùng backslash không match trên Windows (cần forward slashes).
- **Fix:** loại `functions/` khỏi Metro watcher bằng absolute path blockList (`40bb491`, `2d0b871`,
  `9545def`), sửa regex blockList dùng `/` thay vì `\` (`436f2ad`). `expo-notifications` từng bị gỡ tạm
  (`c38c41b`, 2026-05-20) rồi **thêm lại** 5 ngày sau cho tính năng nhắc thuốc (`4a8ee8d`) sau khi đã
  tách notifications thành file platform riêng (`notifications.native.ts` / `.web.ts` — xem
  `ARCHITECTURE.md` và `DECISIONS.md`), tức root cause thật là "bundle web kéo cả code native", không
  phải bản thân package.
- **Nếu gặp lại:** kiểm tra `metro.config.js` blockList trước, và đảm bảo import native-only package chỉ
  nằm trong file `.native.ts`.

### `firebase/messaging` gây lỗi MIME trên web
- **Nguyên nhân:** `firebase/messaging` không tương thích tốt với bundle web qua Metro, gây lỗi MIME type.
- **Fix:** gỡ khỏi bundle web (`cf7112b`). Push notification cho web dùng đường khác (xem
  `notifications.ts` vs `notifications.native.ts`).

### Firestore rules: `chatThreads` permission denied / broken read khi document chưa tồn tại
- **Nguyên nhân:** rule kiểm tra `resource.data.*` khi document đích chưa tồn tại → lỗi null; và 1 lần
  sửa rule cho `list` query đã vô tình làm hỏng rule đọc message khác.
- **Fix:** loạt commit `5544c4e` → `10e18b8` → `6e9e1c7` sửa rules cho `chatThreads`/`messages`.
- **Bài học:** khi sửa `firestore.rules`, kiểm tra lại **toàn bộ** các `match` block liên quan
  (list/get/create/update) chứ không chỉ block đang cần sửa — rules dễ vỡ chéo nhau.

### UserMenu (avatar dropdown) không hoạt động đúng trên web
- **Nguyên nhân:** transform ancestors (do NativeWind/RN Web layout) làm `position: absolute` bị lệch;
  Modal fade animation gây lỗi opacity/pointer-events trên web.
- **Fix:** dùng `ReactDOM` portal cho web (`a3f3f4d`), fixed-position overlay (`4273b7a`), skip Modal fade
  animation trên web (`e3faf01`), absoluteFill backdrop + file picker riêng cho web (`00f9022`).
- **Bài học:** bất kỳ dropdown/overlay UI mới nào cũng nên kiểm tra riêng trên web target — RN Web xử lý
  `position: absolute` và Modal khác native đáng kể.

### Upload avatar lỗi trên web / lưu nhầm `file://` URI vào Firestore
- **Nguyên nhân:** web không dùng `file://` URI như native; code gốc giả định URI luôn dùng được trực
  tiếp.
- **Fix:** trên web fetch blob rồi upload (`3a18664`); không lưu `file://` URI vào Firestore nếu upload
  thất bại (`55fa920`).
- **Bài học:** mọi flow upload ảnh (avatar, OCR, prescription photos) cần test cả native lẫn web —
  URI scheme khác nhau là nguồn lỗi lặp lại.

### iOS crash vì thiếu `iosClientId`/`webClientId` trong `expo-auth-session`
- **Nguyên nhân:** Google/Facebook sign-in config thiếu client ID cho đúng platform gây crash thay vì lỗi
  mềm.
- **Fix:** `bd319bd`, `57f92cd` — guard khi thiếu client ID.
- **Bài học:** khi thêm provider auth mới, luôn set client ID cho **cả 3** platform (iOS/Android/Web) hoặc
  guard rõ ràng nếu thiếu.

### GPS background tracking thiếu quyền trên iOS
- **Nguyên nhân:** thiếu location permission strings + background modes trong `Info.plist`.
- **Fix:** `f47df56` thêm permission strings + background modes.
- **Bài học:** tính năng background location mới trên iOS luôn cần cập nhật `Info.plist`
  (`app.json` → `ios.infoPlist`), không tự động có.

### Upload ảnh đơn thuốc bị 413 Request Entity Too Large (production)
- **Ngày phát hiện & sửa:** 2026-07-02.
- **Triệu chứng:** trên `connectdoctor.tuandv.id.vn/profile`, chọn ảnh đơn thuốc (~3MB) để upload báo lỗi,
  network tab cho thấy `POST https://api.tuandv.id.vn/storage/upload` → `413 Request Entity Too Large`
  (response HTML nhỏ, `Content-Type: text/html` → lỗi từ nginx, không phải app).
- **Nguyên nhân:** server nginx (VPS `3.27.76.114`, xem `reference_build_server` trong memory cá nhân)
  không set `client_max_body_size` cho site `api.tuandv.id.vn` (`/etc/nginx/sites-enabled/api.tuandv.id.vn`)
  → mặc định nginx giới hạn 1MB, chặn trước khi tới app. App phía sau (`multer` trong
  `~/xsmbapi/storage-router.js` trên cùng VPS — service upload dùng chung cho nhiều project, xem
  `ARCHITECTURE.md` → "Hạ tầng production") **không** giới hạn kích thước.
- **Fix:** thêm `client_max_body_size 20m;` vào server block 443 của
  `/etc/nginx/sites-enabled/api.tuandv.id.vn`, `nginx -t` rồi `systemctl reload nginx`. Đã backup file gốc
  thành `api.tuandv.id.vn.bak-20260702` trước khi sửa. Verify bằng `curl -F file=@3mb.bin` → `200`.
- **Bài học:** đây là 1 trong nhiều site nginx trên VPS dùng chung — chưa audit các site khác
  (kinhdich, xsmbfrontend, ...) xem có cùng thiếu `client_max_body_size` không. Xem `TODO.md`.

### `Alert.alert()` hoàn toàn không hoạt động trên web build — lỗi hệ thống, chưa fix hết
- **Ngày phát hiện:** 2026-07-02, khi debug việc auto-OCR "chạy xong nhưng không thấy gì" trên web.
- **Nguyên nhân:** `node_modules/react-native-web/dist/exports/Alert/index.js` chỉ export
  `class Alert { static alert() {} }` — một no-op hoàn toàn, không fallback sang `window.alert`/`confirm`.
  Toàn bộ `Alert.alert(...)` gọi trên web build **im lặng không làm gì**, kể cả khi có `buttons` với
  `onPress` (nghĩa là **các hộp thoại xác nhận hành động, ví dụ nút "Xoá đơn thuốc này", không hiện gì
  trên web và callback `onPress` không bao giờ chạy** — hành động bị coi như không làm gì, không phải lỗi
  ẩn).
- **Phạm vi:** grep thấy 42 lời gọi `Alert.alert(` trải trên 9 file: `profile.tsx` (15),
  `EmergencyContacts.tsx` (7), `family-group/[id].tsx` (5), `ocr/review.tsx` (4), `sign-up.tsx` (3),
  `ocr/upload.tsx`, `tasks.tsx`, `FamilyGroups.tsx`, `NewChatSheet.tsx` (2 mỗi file).
- **Đã fix cục bộ:** `app/(patient)/profile.tsx` → luồng auto-OCR khi thêm ảnh đơn thuốc, dùng banner
  inline (state `ocrMsg`) thay vì phụ thuộc `Alert.alert` (commit `422a6b2`).
- **Chưa fix:** 41 lời gọi còn lại, bao gồm các xác nhận xoá (destructive) — trên web, bấm nút xoá sẽ
  **không hỏi xác nhận và không xoá được gì** (không phải "xoá không hỏi" — mà là "không làm gì cả"), vì
  callback nằm trong `buttons[].onPress` của `Alert.alert` không bao giờ được gọi.
- **Fix triệt để đề xuất:** viết 1 helper cross-platform (vd. `lib/alert.ts`) — trên web dùng
  `window.confirm`/`window.alert`, trên native dùng `Alert.alert` — rồi thay thế tất cả 42 chỗ. Đây là
  việc lớn, chạm 9 file, **chưa làm** — xem `TODO.md`.

## Workaround đang áp dụng (chưa phải fix triệt để)

- **`EXPO_PUBLIC_*` lộ API key phía client** — chấp nhận được cho dev, chưa fix triệt để (xem `TODO.md`
  mục "Giấu API key Gemini/Groq sau Cloud Functions").
- **`lib/mockDoctors.ts` vẫn là nguồn dữ liệu bác sĩ trong màn chat** thay vì Firestore thật — không phải
  bug (chưa từng hoạt động đúng), nhưng là gap đã biết — xem `TODO.md`.
- **README.md lỗi thời** so với cấu trúc thực tế — không ảnh hưởng runtime, nhưng gây hiểu nhầm cho người
  đọc mới — xem `TODO.md`.

## Bug còn tồn tại / chưa xác nhận

- Chưa phát hiện bug mở nào được ghi nhận rõ ràng tại thời điểm viết file này (2026-07-02). Working tree
  có 2 luồng code chưa commit (presence chat, structured meds editor — xem `CURRENT_STATUS.md`) —
  **chưa được test/xác nhận không có bug**, cần kiểm tra khi hoàn thiện trước khi commit.
