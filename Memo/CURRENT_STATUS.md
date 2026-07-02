# CURRENT_STATUS.md

> Trạng thái thực tế mới nhất. Cập nhật file này sau mỗi task/milestone lớn.

**Cập nhật lần cuối:** 2026-07-02
**Branch:** `master`, đi trước `origin/master` 2 commit local (`e2e0161`, `1b8df52`) — **chưa push**.
**HEAD:** `1b8df52` — feat(prescriptions): structured per-medication editor, note field freed up

## Đang làm gì

Hai luồng việc trước đây là uncommitted WIP nay đã **commit xong** (chưa push lên origin):

1. **Presence / trạng thái online trong chat** — commit `e2e0161`.
   - `hooks/useOnlineStatus.ts` (mới) — hook subscribe `isOnline()` từ `lib/users.ts` cho danh sách uid,
     hiển thị chấm "đang online" trong danh sách chat/thread.
   - Wire vào `app/(doctor)/messages.tsx`, `app/(patient)/messages.tsx`,
     `app/(doctor)/chat/[patientId].tsx`, `app/(patient)/chat/[doctorId].tsx`.
2. **Structured meds editor trong hồ sơ bệnh nhân** — commit `1b8df52`.
   - `app/(patient)/profile.tsx` — thêm `MedsEditor`, cho sửa từng thuốc (tên/liều/nhóm) có cấu trúc thay
     vì chỉ note tự do; fallback hiển thị `note` cho đơn cũ chưa có `meds[]`.
   - `lib/prescriptions.ts` — thêm `updatePrescriptionMeds`, `makeMedId`; `createPrescription` giờ nhận
     `meds[]` trực tiếp.
   - `app/(patient)/ocr/review.tsx` — OCR review giờ lưu thẳng `meds[]` có cấu trúc thay vì gộp thành 1
     chuỗi `note`.

**Chưa test thủ công trên thiết bị/browser** — cả 2 tính năng mới commit, nên chạy thử trước khi push
hoặc merge PR nếu có quy trình đó.

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

- Hoàn thiện + commit 2 luồng WIP ở trên (presence trong chat, structured meds editor).
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
