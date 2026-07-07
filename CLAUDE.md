# ConnectDoctor — Project Context for Claude

Telemedicine app (React Native + Expo) with two roles: **patient** and **doctor**.
Backend: Firebase Auth + Firestore + Storage. AI: Groq (triage) + Google Gemini (OCR).

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | Expo SDK 52, React Native 0.76 |
| Routing | expo-router (file-based) |
| Styling | NativeWind v4 (Tailwind for RN) |
| State | Zustand (`hooks/useAuth.ts`) |
| Backend | Firebase Auth + Firestore + Storage |
| AI | Groq (`lib/ai.ts`) + Google Gemini (`lib/ocr.ts`) |
| Types | TypeScript strict |

---

## Route Structure

```
app/
├── _layout.tsx                  # Root — redirects by auth state + role
├── (auth)/
│   ├── role-select.tsx          # Choose patient or doctor
│   ├── sign-up.tsx
│   └── sign-in.tsx
├── (patient)/                   # Tab navigator for patients
│   ├── home.tsx                 # AI symptom input + health summary
│   ├── messages.tsx             # Chat thread list
│   ├── history.tsx              # Health event timeline
│   ├── profile.tsx              # Demographics, meds, metrics tabs
│   ├── ai/
│   │   ├── index.tsx            # Multi-step AI triage questions
│   │   └── result.tsx           # Suggested doctors list
│   ├── chat/
│   │   ├── [doctorId].tsx       # Chat thread screen (real-time)
│   │   └── doctor/[doctorId].tsx # Doctor profile detail
│   └── ocr/
│       ├── upload.tsx           # Image picker
│       ├── review.tsx           # AI-extracted items review
│       └── confirm.tsx          # Success summary
└── (doctor)/                    # Tab navigator for doctors
    ├── home.tsx                 # Stats + patient queue + schedule
    ├── messages.tsx             # Chat thread list
    ├── patients.tsx             # Patient roster
    ├── profile.tsx              # Doctor credentials + work history
    └── chat/
        └── [patientId].tsx      # Chat thread screen (real-time)
```

### Navigation helpers

```tsx
import { useRouter } from "expo-router";
const router = useRouter();

router.push("/(patient)/chat/doctor123");
router.push({ pathname: "/(patient)/ai", params: { complaint: "đau đầu" } });
router.back();
```

---

## Design System

### Color Tokens (NativeWind classes)

```
Background
  bg-paper          #fafaf7   — main background (warm white)
  bg-paper-2        #f1f0ea   — slightly darker, for nested areas

Text
  text-ink          #1a1a1a   — primary text
  text-ink-2        #444444   — secondary text
  text-ink-3        #767676   — muted/captions
  text-ink-4        #b5b5b5   — placeholder

Borders
  border-line       #2a2a2a   — default border
  border-line-soft  #c8c8c2   — soft/dashed dividers

Accent (health green)
  bg-accent         #5eb594   — primary action background
  bg-accent-soft    #dceee4   — soft accent tint
  text-accent-ink   #2f6b54   — accent text / dark green
  border-accent-ink #2f6b54   — accent border

Status
  text-warn / bg-warn    #d8a653  — warning
  text-danger / bg-danger #c3604a  — error / destructive

Typography
  font-mono    — JetBrainsMono (numbers, codes, timestamps)
  font-bold    — Inter Bold
```

### Border Radius

```
rounded-card   — 12px, used on Card components
rounded-full   — pills, avatars, chips
rounded-xl     — buttons
rounded-lg     — inputs, inline surfaces
```

### Typography Scale (common patterns)

```
text-[10px] uppercase tracking-wider font-bold  — section labels
text-xs font-bold                               — card titles, button text
text-[11px] text-ink-3                          — captions, metadata
text-sm                                         — body, inputs
text-base font-bold tracking-tight              — screen titles (AppBar)
text-2xl font-mono font-bold                    — metric numbers
font-mono text-xs                               — timestamps, codes
```

---

## Component Library

All components are in `components/`. Import path: `@/components/...`

### `<Card>` — `@/components/ui/Card`

```tsx
<Card variant="default" | "soft" | "accent"  padding="none" | "sm" | "md" | "lg">
```
- `default` — `border-line bg-paper`
- `soft` — `border-line-soft border-dashed bg-paper`
- `accent` — `border-accent-ink bg-accent-soft`

### `<Button>` — `@/components/ui/Button`

```tsx
<Button
  variant="primary" | "secondary" | "ghost" | "danger"
  size="sm" | "md" | "lg"
  block           // full width
  disabled
  loading         // shows ActivityIndicator
  leftIcon={<Icon />}
  onPress={fn}
>
  Label
</Button>
```
- `primary` — green accent fill
- `secondary` — paper with border
- `ghost` — transparent
- `danger` — red fill

### `<Avatar>` — `@/components/ui/Avatar`

```tsx
<Avatar label="Nguyễn Văn A"  size="sm" | "md" | "lg" | "xl"  square  uri="https://..." />
```
Shows initials (last 2 words) when no `uri`.

### `<Chip>` — `@/components/ui/Chip`

```tsx
<Chip variant="default" | "soft" | "accent"  onPress={fn}>Label</Chip>
```
Pill-shaped badge. Optional `onPress` makes it a button.

### `<Input>` — `@/components/ui/Input`

```tsx
<Input label="Email" error="Bắt buộc" rightAdornment={<Icon />} placeholder="..." />
```
Extends `TextInputProps`. Shows label above, error below.

### `<AppBar>` — `@/components/AppBar`

```tsx
<AppBar title="Màn hình" subtitle="Mô tả" back right={<Avatar />} left={<Icon />} />
```
Top bar with back arrow support. Always the first element in a screen's ScrollView.

### `<Section>` — from `@/components/ui/Segmented`

```tsx
<Section title="TIÊU ĐỀ" action={<Button size="sm">Xem thêm</Button>}>
  {/* content */}
</Section>
```
Labeled group with optional right action.

### `<Segmented>` — from `@/components/ui/Segmented`

```tsx
<Segmented value={tab} options={[{value:"a", label:"Tab A"}]} onChange={setTab} />
```
Pill toggle (iOS segment control style).

### `<TopTabs>` — `@/components/TopTabs`

```tsx
<TopTabs tabs={[{key:"info", label:"Thông tin"}]} active={tab} onChange={setTab} />
```
Underline tab bar, used inside screens (not navigation).

### `<Divider>` — from `@/components/ui/Segmented`

```tsx
<Divider />          // solid line
<Divider dashed />   // dashed line
```

### `<Note>` — `@/components/Note`

```tsx
<Note>Ghi chú quan trọng</Note>
```
Yellow callout box for informational notes.

---

## Screen Template

Every screen follows this structure:

```tsx
import { ScrollView, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/hooks/useAuth";

export default function MyScreen() {
  const user = useAuthStore((s) => s.user);
  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title="Tiêu đề" subtitle="Mô tả" />
        {/* content */}
      </ScrollView>
    </SafeAreaView>
  );
}
```

For screens inside chat or modal (no tab bar), use `KeyboardAvoidingView`.

---

## Data Models (`lib/types.ts`)

```ts
AppUser       { uid, email, phone, displayName, role, createdAt }
PatientProfile { uid, fullName, birthYear, gender, heightCm, weightKg, bloodType, conditions[], allergies[] }
Medication    { id, name, dose, category, source: "manual"|"ocr", createdAt }
MetricEntry   { id, patientUid, type, label, value, unit, source, measuredAt, createdAt }
DoctorProfile { uid, fullName, specialty, degree, university, workplace, yearsExperience, verified, rating }
Credential    { id, doctorUid, title, school, year, fileUrl, status }
ChatThread    { id, patientUid, doctorUid, patientName, doctorName, lastMessage, lastMessageAt, unreadForPatient, unreadForDoctor }
ChatMessage   { id, threadId, fromUid, toUid, text, imageUrl, createdAt, readAt }
AiSession     { id, patientUid, initialComplaint, questions[], suggestedSpecialties[], suggestedDoctors[] }
```

---

## Firestore Collections

```
/users/{uid}
/patientProfiles/{uid}
/medications/{id}              — field: patientUid
/medicationSnapshots/{id}      — field: patientUid
/metrics/{id}                  — field: patientUid
/doctorProfiles/{uid}
/credentials/{id}              — field: doctorUid
/chatThreads/{threadId}        — threadId = "{patientUid}_{doctorUid}"
  └── /messages/{msgId}
/aiSessions/{id}               — field: patientUid
```

---

## Auth & State

```tsx
import { useAuthStore } from "@/hooks/useAuth";

const user = useAuthStore((s) => s.user);       // AppUser | null
const initializing = useAuthStore((s) => s.initializing);
```

Auth functions: `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`, `signOut` — all in `lib/auth.ts`.

---

## Chat Service (`lib/chat.ts`)

```ts
getOrCreateThread(patientUid, doctorUid, { patientName, doctorName }) → Promise<threadId>
sendMessage(threadId, fromUid, toUid, text)   → Promise<void>
subscribeToMessages(threadId, callback)        → Unsubscribe
subscribeToThreads(uid, role, callback)        → Unsubscribe
markThreadRead(threadId, role)                 → Promise<void>
```

---

## AI & OCR (`lib/ai.ts`, `lib/ocr.ts`)

```ts
startTriage(complaint: string) → { questions, specialties, conditions }   // Groq (llama-3.3-70b-versatile)
extractMedsFromImage(imageUri) → { name, dose, category }[]               // Gemini
extractMetricsFromImage(imageUri) → { label, value, unit }[]              // Gemini
```
`startTriage` falls back to mock data when `EXPO_PUBLIC_GROQ_API_KEY` is empty; OCR functions fall back to mock data when `EXPO_PUBLIC_GEMINI_API_KEY` is empty.

---

## Coding Conventions

- **No StyleSheet.create** — use NativeWind `className` only
- **No inline color hex** — use token classes (`text-ink-3`, not `color: "#767676"`)
- **No custom components** when a library one exists — use `Card`, `Button`, `Chip`, etc.
- **No comments** unless the WHY is non-obvious
- **Layouts**: `gap-*` on ScrollView contentContainerStyle, `gap-*` on View for spacing between items
- **Lists**: always include an empty state message when list can be empty
- **Error handling**: all Firestore `onSnapshot` calls must have an error callback (second/third arg)
- **Unsubscribe**: always return `unsub` from `useEffect` that sets up Firestore listeners

---

## How to Add a New Screen

1. Create file at the correct route path under `app/`
2. Use the screen template above
3. If it needs data: add a `useEffect` with Firestore listener or one-shot `getDoc`
4. If it's navigable from a list: add `onPress={() => router.push(...)}`
5. No need to register routes — expo-router picks them up automatically

---

## How to Adapt Claude Design Output

When Claude Design generates standalone component code, adapt it to this project:

1. Replace `StyleSheet.create({...})` → NativeWind `className="..."`
2. Replace hardcoded hex colors → token classes (see Design System above)
3. Replace custom card/button/chip/input → project components from `@/components/ui/`
4. Replace placeholder data → `useAuthStore` + Firestore calls from `lib/`
5. Replace navigation → `useRouter()` from `expo-router`
6. Wrap in `SafeAreaView className="flex-1 bg-paper"` + `ScrollView`
