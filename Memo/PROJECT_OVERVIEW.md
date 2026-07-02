# PROJECT_OVERVIEW.md

> Source of truth. Only long-lived knowledge lives here — read this file first in every new session.

## Mục tiêu sản phẩm

ConnectDoctor là app telemedicine (React Native + Expo, một codebase chạy iOS / Android / Web) kết nối
**bệnh nhân (patient)** và **bác sĩ (doctor)**, với hai luồng chính:

1. Bệnh nhân mô tả triệu chứng → AI triage hỏi thêm câu hỏi → gợi ý chuyên khoa/bác sĩ phù hợp.
2. Bệnh nhân & bác sĩ nhắn tin real-time (1-1, và chat nhóm gia đình) để theo dõi và tư vấn.

Xung quanh lõi đó là các tính năng hỗ trợ: hồ sơ sức khoẻ (chỉ số XN, đơn thuốc, OCR), nhắc uống thuốc,
theo dõi vị trí & sức khoẻ người thân (gia đình), tích hợp đồng hồ Garmin, và một hệ thống nội bộ để giao
việc cho AI agent (Claude Code) làm việc trên chính repo này.

## Các tính năng chính

- **Auth & role**: đăng ký/đăng nhập bằng email, Google, Facebook; chọn vai trò patient/doctor lúc đăng ký.
- **Patient home**: hero + ô hỏi triệu chứng lớn → chuyển vào flow AI triage.
- **AI triage**: hỏi đáp nhiều bước (multiple-choice) → danh sách bác sĩ gợi ý theo chuyên khoa.
- **Chat**: nhắn tin real-time patient↔doctor; chat nhóm gia đình (family group); video call modal;
  presence "đang online" (đã lên production 2026-07-02).
- **Hồ sơ bệnh nhân**: thông tin cá nhân, chỉ số sức khoẻ (huyết áp, đường huyết, ...), đơn thuốc
  (structured meds list + ghi chú tự do + ảnh chụp đơn).
- **OCR**: 2 điểm vào — (1) flow riêng `ocr/upload → review → confirm` tạo đơn/chỉ số mới hoàn toàn từ
  ảnh; (2) trong màn chỉnh sửa đơn thuốc thủ công (Hồ sơ → Đơn thuốc → mở 1 đơn), mỗi lần thêm ảnh cũng
  tự động chạy OCR và gộp thuốc nhận diện được vào danh sách sẵn có (từ 2026-07-02) — cả 2 điểm vào đều
  cho sửa lại thông tin trước khi lưu thật vào Firestore.
- **Sức khoẻ & vị trí gia đình**: dashboard sức khoẻ (nhịp tim, số bước) từ đồng hồ Garmin (BLE), bản đồ
  vị trí GPS real-time của người thân, nút "Chỉ đường về nhà".
- **Nhắc thuốc**: lịch nhắc uống thuốc bằng local notifications.
- **Kiến thức sức khoẻ**: các "knowledge track" (bài viết/nội dung giáo dục sức khoẻ).
- **Hệ thống agent nội bộ (không phải tính năng cho end-user)**: màn `tasks.tsx` cho admin giao việc,
  Firestore collections `tasks` + `repos`, và `scripts/agent-tasks.mjs` để Claude Code agent tự lấy việc,
  làm, và báo cáo kết quả trên nhiều repo (multi-repo support).

## Công nghệ sử dụng

| Layer | Library |
|---|---|
| Framework | Expo SDK 52, React Native 0.76 |
| Routing | expo-router (file-based) |
| Styling | NativeWind v4 |
| State | Zustand (`hooks/useAuth.ts`); TanStack Query dùng rải rác (vd. `app/(patient)/health.tsx`) |
| Backend | Firebase Auth + Firestore + Storage + Cloud Functions |
| AI triage | Google Gemini (`lib/ai.ts`) — fallback mock khi thiếu API key |
| OCR (đơn thuốc/chỉ số) | Groq vision (`lib/ocr.ts`) — đã thay thế Gemini/mock (từ commit `1703993`) |
| Bản đồ | react-native-maps + Google Maps deep-link |
| Thiết bị đeo | react-native-ble-plx (Garmin watch) |
| Types | TypeScript strict |

Ba nền tảng build: `npm run ios`, `npm run android`, `npm run web` / `expo export --platform web`.

## Ràng buộc quan trọng

- **`EXPO_PUBLIC_*` env vars bị lộ ra client.** Đây là biết trước, chấp nhận được cho dev; cho production
  cần chuyển các API call nhạy cảm (Gemini, Groq) sang Cloud Functions để giấu key. Hiện tại **chưa làm**
  việc này — xem `TODO.md`.
  - Fallback: khi thiếu `EXPO_PUBLIC_GEMINI_API_KEY`, `lib/ai.ts` dùng mock data thay vì gọi API thật.
- **Platform-split files**: nhiều module có bản `.native.ts`/`.web.ts` riêng (health, locationTracking,
  ble, voiceNav, FamilyMap, HealthMap, VideoCallModal, WebPortal, HomeAddressPicker) để tránh bundle
  native-only code (BLE, expo-speech, background location) vào build web.
- **Ngôn ngữ UI**: toàn bộ copy trong app là tiếng Việt.
- **Không dùng StyleSheet.create, không hex màu inline** — xem quy ước đầy đủ trong `CLAUDE.md` (đã có
  sẵn ở project root, không lặp lại ở đây).

## Business rules đáng chú ý

- Vai trò (`role`) là `patient | doctor | admin`, lưu ở `/users/{uid}`. `admin` dùng cho tài khoản vận
  hành hệ thống agent (`admin@connectdoctor.app`), không phải vai trò end-user thông thường.
- `chatThreads/{threadId}` dùng id dạng `"{patientUid}_{doctorUid}"` — quan hệ patient-doctor là 1 thread
  cố định, không tạo thread trùng.
- Family chat/group là mô hình riêng (`familyChats`, `familyGroups`), tách biệt khỏi chat patient-doctor.
- Vị trí GPS người thân chỉ đọc được nếu nằm trong `locationSharedWith` của user đó (subcollection
  `locationRecords/{uid}/points`).
- Đơn thuốc (`prescriptions`) hỗ trợ 2 dạng dữ liệu song song: `meds[]` có cấu trúc (tên/liều/nhóm) và
  `note` tự do — ưu tiên hiển thị `meds[]` nếu có, fallback về `note` cho đơn cũ chưa migrate.

## App Store requirements

Chưa có tài liệu chính thức nào về App Store/Play Store review requirements trong repo (không tìm thấy
privacy manifest, data-safety form, hay checklist compliance). **Gap cần lưu ý** — ghi vào `TODO.md` nếu
chuẩn bị submit.

## Assumptions quan trọng

- Firestore là nguồn dữ liệu duy nhất (không có REST backend riêng ngoài Cloud Functions cho
  commit-review). Không có ORM/migration formal — schema suy ra từ `firestore.rules` (xem
  `ARCHITECTURE.md`).
- README.md ở root **đã lỗi thời** (liệt kê ít file/module hơn thực tế hiện có trong `lib/` và `app/`) —
  không coi README.md là nguồn sự thật về cấu trúc hiện tại; dùng `ARCHITECTURE.md` (file này) thay thế.
- `CLAUDE.md` (root) vẫn là nguồn đúng cho: design system/tokens, thư viện component (`@/components/ui`),
  quy ước code, và route structure tổng quát. Không lặp lại nội dung đó trong `Memo/` — chỉ tham chiếu.

## Kiến thức cần biết mỗi khi bắt đầu session mới

1. Đọc theo thứ tự: `PROJECT_OVERVIEW.md` (file này) → `ARCHITECTURE.md` → `CURRENT_STATUS.md` →
   `TODO.md` → `DECISIONS.md` → `BUGS.md`.
2. Sau đó đọc `CLAUDE.md` ở root để nắm design system + coding conventions (không trùng lặp trong Memo/).
3. Coi các file trong `Memo/` là nguồn sự thật chính thức — không dựa vào lịch sử hội thoại cũ.
