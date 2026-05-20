// Shared types across the app.

export type Role = "patient" | "doctor" | "admin";

export interface AppUser {
  uid: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: Role;
  createdAt: number;
  expoPushToken?: string;  // iOS / Android
  fcmToken?: string;       // Web push
}

export interface PatientProfile {
  uid: string;
  fullName: string;
  birthYear?: number;
  gender?: "male" | "female" | "other";
  heightCm?: number;
  weightKg?: number;
  bloodType?: string;
  conditions: string[];
  allergies: string[];
}

export interface Medication {
  id: string;
  name: string;
  dose: string;     // "1 viên / sáng"
  category?: string; // e.g. "Huyết áp"
  source: "manual" | "ocr";
  createdAt: number;
}

export interface MedicationSnapshot {
  id: string;
  patientUid: string;
  meds: Medication[];
  changeLog?: string;
  imageUrl?: string;
  createdAt: number;
}

export type MetricType =
  | "blood_pressure"
  | "heart_rate"
  | "blood_glucose"
  | "cholesterol"
  | "urine_test"
  | "blood_test"
  | "custom";

export interface MetricEntry {
  id: string;
  patientUid: string;
  type: MetricType;
  label: string;
  value: string;       // store as string for flexibility ("124/80", "5.4 mmol/L")
  unit?: string;
  source: "manual" | "ocr";
  measuredAt: number;
  createdAt: number;
}

export interface DoctorProfile {
  uid: string;
  fullName: string;
  specialty: string;
  degree: string;
  university: string;
  workplace: string;
  yearsExperience?: number;
  verified: boolean;
  rating?: number;
  email?: string;
  phone?: string;
}

export interface Credential {
  id: string;
  doctorUid: string;
  title: string;
  school: string;
  year: number;
  fileUrl?: string;
  status: "verified" | "pending" | "rejected";
}

export interface AiSession {
  id: string;
  patientUid: string;
  initialComplaint: string;
  questions: AiQuestion[];
  suggestedSpecialties: string[];
  suggestedDoctors: string[]; // doctor uids
  createdAt: number;
}

export interface AiQuestion {
  prompt: string;
  options: string[];
  answer?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  fromUid: string;
  toUid: string;
  text?: string;
  imageUrl?: string;
  createdAt: number;
  readAt?: number;
}

export interface ChatThread {
  id: string;
  patientUid: string;
  doctorUid: string;
  lastMessage?: string;
  lastMessageAt?: number;
  unreadForPatient?: number;
  unreadForDoctor?: number;
}
