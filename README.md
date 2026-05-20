# ConnectDoctor — Expo (RN + Web) frontend

**Stack:** Expo SDK 52 · Expo Router (file-based) · NativeWind v4 (Tailwind for RN) · Firebase JS modular SDK · TanStack Query · Zustand · TypeScript

One codebase, three targets: **iOS · Android · Web**.

```
connectdoctor-app/
├── app/                      # File-based routes (Expo Router)
│   ├── _layout.tsx           #   root + auth gate + provider tree
│   ├── index.tsx             #   splash redirect
│   ├── (auth)/               #   role-select, sign-up, sign-in
│   ├── (patient)/            #   tabs: home, messages, history, profile
│   │   ├── home.tsx          #     hero + AI question box + suggestions
│   │   ├── profile.tsx       #     3 tabs: info / meds / metrics
│   │   ├── ai/               #     multiple-choice flow + result list
│   │   ├── ocr/              #     upload → review → confirm
│   │   └── chat/             #     [doctorId] thread + doctor profile
│   └── (doctor)/             #   home, patients, messages, profile (3 tabs)
├── components/
│   ├── ui/                   #   Button, Card, Input, Chip, Avatar, Segmented
│   ├── AppBar.tsx
│   ├── TopTabs.tsx
│   ├── MetricChart.tsx       #   tiny SVG trend chart (BP, HR…)
│   └── Note.tsx
├── lib/
│   ├── firebase.ts           #   modular SDK + RN persistence
│   ├── auth.ts               #   email/google/facebook + role doc
│   ├── ai.ts                 #   Gemini triage (fallback mock)
│   ├── ocr.ts                #   Gemini OCR (fallback mock)
│   ├── linking.ts            #   mailto: / tel: helpers
│   ├── theme.ts              #   color tokens for SVG/charts
│   ├── types.ts              #   shared TS types
│   └── mockDoctors.ts        #   demo data — replace w/ Firestore
├── hooks/useAuth.ts          #   Zustand store + Firebase listener
├── app.json                  #   Expo config (iOS/Android/Web targets)
├── tailwind.config.js        #   color/font tokens (health-green palette)
└── global.css                #   tailwind layers
```

## Cài đặt

```bash
cd connectdoctor-app
npm install              # or pnpm install / yarn
```

### Firebase

1. Tạo project ở https://console.firebase.google.com
2. Bật **Authentication** → enable Email/Password, Google, Facebook, Phone
3. Bật **Firestore** + **Storage**
4. Copy **Web app config** vào file `.env`:

```bash
# .env (KHÔNG commit)
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...

# Gemini (cho AI hỏi đáp + OCR). Để trống → app dùng mock data.
EXPO_PUBLIC_GEMINI_API_KEY=...
```

Note: `EXPO_PUBLIC_*` được expose ra client. Cho production, chuyển các API call sang Cloud Functions / Vercel Functions để giấu key.

## Chạy dev

```bash
npm run web          # mở trên trình duyệt
npm run ios          # giả lập iOS (cần Xcode)
npm run android      # giả lập Android (cần Android Studio)
npm start            # QR code để dùng Expo Go trên điện thoại thật
```

## Build production

```bash
npm run build:web                       # tĩnh trong dist/ — deploy lên Vercel/Netlify
npx eas build -p ios --profile production
npx eas build -p android --profile production
```

(Cần cài `eas-cli` và tạo `eas.json` lần đầu: `npm i -g eas-cli && eas init`.)

## TODOs còn lại (intentional)

Code này là **scaffold hoàn chỉnh về UI + flow**. Phần backend logic còn các điểm cần wire vào:

| File | TODO |
|---|---|
| `lib/firebase.ts` | Điền config Firebase thật |
| `lib/auth.ts` | Native Google/Facebook qua `expo-auth-session` (web đã chạy với `signInWithPopup`) |
| `lib/ai.ts` | Đã có Gemini integration, cần API key. Đổi sang OpenAI/Claude tùy ý |
| `lib/ocr.ts` | Đang dùng Gemini Vision. Production: thêm `@react-native-ml-kit/text-recognition` cho offline native OCR |
| `lib/mockDoctors.ts` | Thay bằng `getDoc(doc(db, "doctors", id))` |
| `app/(patient)/messages.tsx`<br>`app/(doctor)/messages.tsx` | Thay mock THREADS bằng `onSnapshot(query(collection(db,'threads')))` |
| `app/(patient)/chat/[doctorId].tsx` | Thay state-based messages bằng Firestore subcollection `threads/{id}/messages` + `addDoc` |
| `app/(patient)/history.tsx` | Query từ `medication_snapshots` + `metric_entries` |

## Thiết kế

Wireframes gốc xem trong project trước (ConnectDoctor wireframes). Mỗi screen ở đây tương ứng 1 phương án đã chốt:
- Đăng ký: C (2 thẻ vai trò lớn) → form đăng ký B
- Patient Home: A (hero câu hỏi lớn)
- AI Q&A: E (multiple-choice form)
- Doctor list: F (list chi tiết, segmented sort)
- Chat: A (header + intro card pinned)
- Profile patient: B (BMI card + chip bệnh nền)
- OCR: full 3-bước flow

Đổi sang phương án khác chỉ cần copy markup từ wireframe sang screen tương ứng — toàn bộ UI primitive đã có.

## Lưu ý kỹ thuật

- **NativeWind v4**: dùng `className=""` trên RN components. Web build tự render qua react-native-web.
- **Expo Router**: file = route. Group folders `(auth)`, `(patient)` không xuất hiện trong URL, chỉ là tổ chức + layout scope.
- **Auth persistence**: AsyncStorage trên native, IndexedDB trên web — đã wire trong `lib/firebase.ts`.
- **Reanimated**: cần `react-native-reanimated/plugin` trong babel.config (đã có).
- **Path alias `@/`**: đã setup trong `tsconfig.json` + `experiments.tsconfigPaths`.
