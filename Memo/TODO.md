# TODO.md

> Backlog. Mỗi task: mô tả, độ ưu tiên, trạng thái, dependencies nếu có.

## High Priority

- **Giấu API key Gemini sau Cloud Functions**
  Mô tả: `EXPO_PUBLIC_GEMINI_API_KEY` (dùng trong `lib/ai.ts` cho AI triage, key gắn thẳng vào query
  string `?key=...`) bị lộ ra client vì convention `EXPO_PUBLIC_*` của Expo. Cần chuyển lời gọi Gemini
  sang Cloud Functions (`functions/`) để giấu key trước khi lên production.
  **Cập nhật 2026-07-02:** `lib/ocr.ts` KHÔNG còn thuộc diện này — OCR đã gọi qua 1 service riêng
  (`https://tuandv80-ocr-numbers.hf.space`) giữ key phía server, không lộ ở client.
  Trạng thái: chưa bắt đầu.
  Dependencies: cần thêm Cloud Function mới (ngoài `commitReview.ts` hiện có).

- **Thay `lib/mockDoctors.ts` bằng query Firestore thật**
  Mô tả: `app/(patient)/chat/[doctorId].tsx` và `chat/doctor/[doctorId].tsx` vẫn gọi `getMockDoctor()`
  thay vì `getDoc(doc(db, "doctorProfiles", id))`. Đây là TODO còn sót lại từ README gốc, vẫn chưa xong.
  Trạng thái: chưa bắt đầu.

- **User xác nhận trên UI thật: presence online + auto-OCR khi thêm ảnh đơn thuốc**
  Mô tả: 2 tính năng đã code, commit, push, và deploy lên production (`e2e0161`, `e421563`) nhưng chưa
  được xác nhận hoạt động đúng trên UI thật. Xem `CURRENT_STATUS.md`.
  Trạng thái: đã deploy, chờ xác nhận.

- **Dọn dữ liệu ảnh/audio cũ bị lưu URL `localhost:8001` hỏng**
  Mô tả: mọi ảnh đơn thuốc, file knowledge track, audio chat, avatar upload **trước** commit `e1b30be`
  (2026-07-02) có thể đã lưu URL nội bộ không dùng được vào Firestore (xem `BUGS.md`). Cần rà & xoá/thêm
  lại thủ công vì code fix chỉ áp dụng cho upload mới, không tự sửa dữ liệu cũ.
  Trạng thái: chưa bắt đầu — chưa biết quy mô ảnh hưởng (chưa query Firestore để đếm).

## Medium Priority

- **Native Google/Facebook sign-in qua `expo-auth-session`**
  Mô tả: README ghi nhận web đã dùng `signInWithPopup`/redirect nhưng native (iOS/Android) social sign-in
  qua `expo-auth-session` cần kiểm tra lại độ hoàn thiện — chưa xác nhận đã xong 100%.
  Trạng thái: cần audit lại `lib/auth.ts`, `hooks/useGoogleSignIn.ts`, `hooks/useFacebookSignIn.ts`.

- **Audit các site nginx khác trên VPS xem có thiếu `client_max_body_size` không**
  Mô tả: đã sửa `api.tuandv.id.vn` (413 khi upload ảnh đơn thuốc >1MB, xem `BUGS.md` 2026-07-02) nhưng
  chưa kiểm tra các site còn lại (`connectdoctor.tuandv.id.vn` chính nó, và site của project khác dùng
  chung VPS) — nếu có luồng upload nào khác cũng có thể dính lỗi tương tự.
  Trạng thái: chưa bắt đầu.

- **OCR offline native (ML Kit) làm fallback**
  Mô tả: README đề xuất `@react-native-ml-kit/text-recognition` cho OCR offline khi không có mạng/API
  key. Hiện tại 100% phụ thuộc Groq vision (network call).
  Trạng thái: chưa bắt đầu. Ưu tiên thấp hơn vì Groq vision đã chạy tốt.

- **Chuẩn hoá pattern `subscribeToX`/`addX` giữa `lib/tasks.ts` và `lib/repos.ts`**
  Mô tả: hai file gần như trùng cấu trúc, có thể trích chung 1 helper `makeFirestoreCollection<T>()` để
  giảm trùng lặp — chỉ làm khi có thêm collection thứ 3 dùng pattern này (tránh trừu tượng hoá sớm).
  Trạng thái: ý tưởng, chưa cần làm ngay.

## Low Priority

- **Tài liệu App Store / Play Store compliance**
  Mô tả: chưa có privacy manifest, data-safety form, hay checklist review requirements nào trong repo.
  Cần chuẩn bị trước khi submit app lên store.
  Trạng thái: chưa bắt đầu — không khẩn cấp vì app chưa ở giai đoạn release.

- **Cập nhật `README.md` cho khớp cấu trúc hiện tại**
  Mô tả: README liệt kê cấu trúc `app/`, `lib/`, `components/` cũ hơn nhiều so với thực tế (thiếu family,
  health, garmin, tasks, knowledge, notifications, v.v.). `ARCHITECTURE.md` trong `Memo/` đã là bản đúng —
  README chỉ cần đồng bộ lại cho người mới vào repo qua GitHub.
  Trạng thái: chưa bắt đầu.
