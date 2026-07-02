# ARCHITECTURE.md

> Cấu trúc thật của source code, cập nhật theo repo hiện tại (không phải theo `README.md`, vốn đã cũ).

## Ghi chú về "module"

Repo không có ranh giới module cứng (không phải monorepo/workspaces) — mọi thứ nằm trong một app Expo
duy nhất. Chia theo domain chức năng, có thể nhóm thành các module logic sau (không nhất thiết đúng 1-1
với thư mục):

1. **Auth** — đăng ký/đăng nhập, role selection.
2. **Patient portal** — home, hồ sơ, đơn thuốc, chỉ số, OCR.
3. **Doctor portal** — home, danh sách bệnh nhân, hồ sơ bác sĩ.
4. **Messaging** — chat patient↔doctor, chat/gọi video nhóm gia đình.
5. **AI & OCR** — triage hỏi đáp (Gemini) + trích xuất đơn thuốc/chỉ số từ ảnh (Groq vision).
6. **Health & Location** — dashboard Garmin, GPS gia đình, nhắc thuốc, bản đồ.
7. **Knowledge** — nội dung giáo dục sức khoẻ (`knowledge.tsx`, `knowledgeTracks.ts`).
8. **Agent/DevOps automation** — hệ thống giao việc nội bộ cho Claude Code agent (`tasks.tsx`,
   `scripts/agent-tasks.mjs`, Cloud Function commit-review). Đây là công cụ vận hành dự án, không phải
   tính năng end-user.

> Nếu bạn (người dùng) có một cách chia 5 module cụ thể khác trong đầu, nói cho Claude biết và file này
> sẽ được tổ chức lại theo đúng ranh giới đó.

## Cấu trúc thư mục (route + code)

```
app/
├── _layout.tsx                     # root layout — auth gate + provider tree
├── index.tsx                       # splash / redirect theo auth state
├── (auth)/                         # role-select, sign-up, sign-in
├── (patient)/                      # tab navigator bệnh nhân
│   ├── home.tsx / health.tsx / history.tsx / knowledge.tsx / tasks.tsx
│   ├── messages.tsx                # danh sách thread chat
│   ├── profile.tsx                 # info / meds (OCR + structured) / metrics
│   ├── ai/{index,result}.tsx       # triage flow
│   ├── ocr/{upload,review,confirm}.tsx
│   ├── chat/[doctorId].tsx, chat/doctor/[doctorId].tsx
│   ├── family-chat/[uid].tsx, family-group/[id].tsx
└── (doctor)/                       # tab navigator bác sĩ
    ├── home.tsx / patients.tsx / profile.tsx / messages.tsx
    ├── chat/[patientId].tsx
    └── weekday-stats/{index,[day]}.tsx

lib/                                 # service layer — mỗi file bọc 1 domain quanh Firestore/Storage
├── firebase.ts                     # init SDK + RN persistence (AsyncStorage native / IndexedDB web)
├── auth.ts, users.ts               # đăng nhập, presence (isOnline), user doc
├── ai.ts                           # Gemini triage (mock fallback)
├── ocr.ts                          # Groq vision OCR (mock fallback nếu thiếu key)
├── chat.ts, familyChat.ts, familyGroups.ts
├── patientProfile.ts, prescriptions.ts, metrics.ts, medicationSchedules.ts
├── health.ts / health.native.ts, healthApi.ts, garmin.ts, ble.ts / ble.web.ts
├── locationTracking.ts / .native.ts, locationApi.ts, geocoding.ts
├── notifications.ts / .native.ts, notify.ts
├── knowledgeTracks.ts
├── tasks.ts, repos.ts              # hệ thống agent automation (Firestore: tasks, repos)
├── pendingCredential.ts, mockDoctors.ts, theme.ts, time.ts, types.ts, linking.ts
└── voiceNav.platform.ts / .native.ts / .web.ts

components/
├── ui/                             # Button, Card, Input, Chip, Avatar, Segmented — primitives dùng khắp app
├── AppBar.tsx, TopTabs.tsx, Note.tsx, MetricChart.tsx
├── FamilyMap.{tsx,.native.tsx,.web.tsx}, HealthMap.{tsx,.native.tsx,.web.tsx}
├── HomeAddressPicker.{tsx,.native.tsx,.web.tsx}
├── VideoCallModal.{tsx,.native.tsx,.web.tsx}, WebPortal.{tsx,.web.tsx}
├── NewChatSheet.tsx, EmergencyContacts.tsx, FamilyGroups.tsx, UserMenu.tsx, SocialIconButton.tsx

hooks/
├── useAuth.ts                      # Zustand store: user, initializing
├── useOnlineStatus.ts              # presence hook (mới, đang WIP — xem CURRENT_STATUS.md)
├── useGoogleSignIn.ts, useFacebookSignIn.ts

functions/                          # Firebase Cloud Functions (TypeScript, compiled ra functions/lib)
└── src/commitReview.ts, index.ts   # auto code-review khi có commit mới (dùng bởi hệ thống agent)

scripts/                            # Node scripts nội bộ (không đóng gói vào app)
├── agent-tasks.mjs                 # agent lấy/hoàn thành task từ Firestore qua REST API
├── notify.mjs                      # gửi Telegram + email khi agent xong việc
├── commit-review.mjs, review-commit.mjs
├── seedAdmin.mjs, patch-worklets.js
```

## Data flow

- **Đọc dữ liệu real-time**: màn hình subscribe trực tiếp Firestore qua `onSnapshot` trong `lib/*.ts`
  (vd. `subscribeToMessages`, `subscribeToThreads`, `subscribeToTasks`, `subscribeToRepos`,
  `subscribeToUser`) → set local state trong component. Không có store trung tâm ngoài `useAuthStore`.
- **Ghi dữ liệu**: gọi hàm service (`addDoc`/`updateDoc`/`setDoc`) trong `lib/*.ts` trực tiếp từ handler
  UI — không có lớp API/backend trung gian ngoài Cloud Functions cho commit-review.
- **AI triage**: `startTriage(complaint)` (`lib/ai.ts`) gọi Gemini, trả về `{ questions, specialties,
  conditions }`; nếu thiếu `EXPO_PUBLIC_GEMINI_API_KEY` → trả mock.
- **OCR**: `extractMedsFromImage` / `extractMetricsFromImage` (`lib/ocr.ts`) gọi Groq vision API, review
  ở `ocr/review.tsx`, Save thật ghi vào `prescriptions` (meds + note + ảnh) hoặc gọi `addMetric` cho chỉ
  số XN (từ commit `3ff5dca`).
- **Agent automation**: `scripts/agent-tasks.mjs next` đọc Firestore REST API (không qua Firebase SDK, vì
  chạy ngoài app) → agent làm việc trên repo tương ứng (`repos` collection, multi-repo) → `waiting <id>
  <result>` cập nhật lại Firestore + trigger `notify.mjs` (Telegram/email).

## Design patterns

- **File-based routing** (expo-router): route group `(auth)`, `(patient)`, `(doctor)` không xuất hiện
  trong URL, chỉ tổ chức + scope layout/tab-bar.
- **Platform split qua tên file**: `.native.ts(x)` / `.web.ts(x)` cho code chỉ tồn tại trên 1 platform
  (BLE, background location, expo-speech, map, video call) — Metro bundler tự chọn file đúng platform,
  tránh kéo native-only deps vào bundle web.
- **Service-per-domain trong `lib/`**: mỗi file export các hàm `subscribeToX` / `addX` / `updateX` bọc
  quanh 1 Firestore collection — không có repository pattern chung, mỗi domain tự viết lại structure
  tương tự (xem `repos.ts` và `tasks.ts` gần như song song nhau).
- **Component primitives** dùng chung từ `components/ui/` — không viết Button/Card/Input custom trong
  từng screen (quy ước bắt buộc, xem `CLAUDE.md`).

## API contracts (nội bộ, không phải REST public)

```ts
// lib/ai.ts
startTriage(complaint: string) → { questions, specialties, conditions }

// lib/ocr.ts
extractMedsFromImage(imageUri) → { name, dose, category }[]
extractMetricsFromImage(imageUri) → { label, value, unit }[]

// lib/chat.ts
getOrCreateThread(patientUid, doctorUid, { patientName, doctorName }) → Promise<threadId>
sendMessage(threadId, fromUid, toUid, text) → Promise<void>
subscribeToMessages(threadId, callback) → Unsubscribe
subscribeToThreads(uid, role, callback) → Unsubscribe
markThreadRead(threadId, role) → Promise<void>

// lib/tasks.ts, lib/repos.ts — hệ thống agent
subscribeToTasks(callback) → Unsubscribe
addTask(title, description, repos[]) → Promise<taskId>
subscribeToRepos(callback) → Unsubscribe
addRepo({ name, url, branch, needReview }) → Promise<repoId>
```

## State management

- **Zustand**: chỉ 1 store toàn cục — `useAuthStore` (`hooks/useAuth.ts`) giữ `user` + `initializing`,
  sync với Firebase Auth listener.
- **TanStack Query**: đã cài (`@tanstack/react-query`) nhưng dùng rải rác, hiện chỉ thấy ở
  `app/_layout.tsx` (setup QueryClientProvider) và `app/(patient)/health.tsx`. Phần lớn màn hình khác
  dùng `useState` + `onSnapshot` trực tiếp, không qua React Query.
- **Local component state**: mặc định cho form, tab UI, editor (vd. `MedsEditor`, `NoteEditor` trong
  `profile.tsx`).

## Database schema (Firestore — suy ra từ `firestore.rules`)

```
/users/{uid}
/patientProfiles/{uid}
/medications/{id}                       — field: patientUid
/medicationSnapshots/{id}               — field: patientUid
/metrics/{id}                           — field: patientUid
/doctorProfiles/{uid}
/credentials/{id}                       — field: doctorUid
/chatThreads/{threadId}                 — id = "{patientUid}_{doctorUid}"
  └── /messages/{msgId}
/familyChats/{threadId}
  └── /messages/{msgId}
/familyGroups/{groupId}
  └── /messages/{msgId}
/knowledgeTracks/{id}
/prescriptions/{id}                     — meds[] (structured) + note (free text) + images[]
/aiSessions/{id}                        — field: patientUid
/users/{uid}/medicationSchedules/{id}
/locationRecords/{uid}/points/{id}      — chỉ đọc được nếu trong locationSharedWith của {uid}
/tasks/{id}                             — hệ thống agent (status: pending|waiting|done)
/repos/{id}                             — hệ thống agent (multi-repo support)
```

## Build pipeline

- Dev: `npm run web|ios|android`, `npm start` (Expo Go QR).
- `postinstall` chạy `scripts/patch-worklets.js` (patch cho react-native-reanimated worklets).
- Web production: `npm run build:web` → static ra `dist/` → deploy Vercel/Netlify.
- Native production: `eas build -p ios|android` (cấu hình trong `eas.json`).
- Cloud Functions: build TypeScript trong `functions/` (`tsc` → `functions/lib/`), deploy qua
  `firebase.json` / `firebase deploy --only functions`.
- Firestore/Storage rules: `firestore.rules`, `storage.rules`, index config `firestore.indexes.json`.

## Dependency graph (tầng cao)

```
app/**  ──depends on──>  components/**, hooks/**, lib/**
components/**  ──depends on──>  lib/theme.ts, lib/types.ts
hooks/useAuth.ts  ──depends on──>  lib/firebase.ts, lib/auth.ts
lib/*.ts (mọi service)  ──depends on──>  lib/firebase.ts
scripts/*.mjs  ──independent──>  gọi Firestore REST API trực tiếp (không import lib/, vì chạy ngoài Expo runtime)
```
