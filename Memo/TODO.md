# TODO.md

> Backlog. Mỗi task: mô tả, độ ưu tiên, trạng thái, dependencies nếu có.

## High Priority

- **Giấu API key Gemini/Groq sau Cloud Functions**
  Mô tả: `EXPO_PUBLIC_GEMINI_API_KEY` và key Groq (dùng trong `lib/ai.ts`, `lib/ocr.ts`) hiện bị lộ ra
  client vì convention `EXPO_PUBLIC_*` của Expo. Cần chuyển các lời gọi AI/OCR sang Cloud Functions
  (`functions/`) để giấu key trước khi lên production.
  Trạng thái: chưa bắt đầu.
  Dependencies: cần thêm Cloud Function mới (ngoài `commitReview.ts` hiện có).

- **Thay `lib/mockDoctors.ts` bằng query Firestore thật**
  Mô tả: `app/(patient)/chat/[doctorId].tsx` và `chat/doctor/[doctorId].tsx` vẫn gọi `getMockDoctor()`
  thay vì `getDoc(doc(db, "doctorProfiles", id))`. Đây là TODO còn sót lại từ README gốc, vẫn chưa xong.
  Trạng thái: chưa bắt đầu.

- **Test thủ công + push 2 tính năng vừa commit**
  Mô tả: presence "đang online" trong chat (commit `e2e0161`) và structured meds editor (commit
  `1b8df52`) đã commit local nhưng chưa test trên thiết bị/browser và chưa push lên `origin/master`.
  Xem chi tiết ở `CURRENT_STATUS.md`.
  Trạng thái: code xong, cần test rồi push.

## Medium Priority

- **Native Google/Facebook sign-in qua `expo-auth-session`**
  Mô tả: README ghi nhận web đã dùng `signInWithPopup`/redirect nhưng native (iOS/Android) social sign-in
  qua `expo-auth-session` cần kiểm tra lại độ hoàn thiện — chưa xác nhận đã xong 100%.
  Trạng thái: cần audit lại `lib/auth.ts`, `hooks/useGoogleSignIn.ts`, `hooks/useFacebookSignIn.ts`.

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
