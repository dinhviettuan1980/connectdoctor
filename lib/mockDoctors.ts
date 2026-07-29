// Mocked doctor lookup — replace with `getDoc(doc(db, "doctors", id))`.

import type { DoctorProfile } from "@/lib/types";
import { MOCK_DOCTORS_DATA } from "@/lib/mockDoctorsData";

const DOCTORS: Record<string, DoctorProfile> = {
  "demo-doctor-1": {
    uid: "demo-doctor-1",
    fullName: "BS. Trần Minh Hùng",
    specialty: "Tim mạch",
    degree: "Tiến sỹ Y khoa",
    university: "ĐH Y Hà Nội",
    workplace: "BV Tim Hà Nội",
    yearsExperience: 15,
    verified: true,
    rating: 4.9,
    email: "hung.tm@bv-tim.vn",
    phone: "+84901234567",
  },
  d2: {
    uid: "d2",
    fullName: "BS. Lê Thị Hoa",
    specialty: "Nội tổng quát",
    degree: "Bác sỹ chuyên khoa I",
    university: "ĐH Y Dược TP. HCM",
    workplace: "BV Đại học Y Dược",
    yearsExperience: 8,
    verified: true,
    rating: 4.8,
    email: "hoa.lt@umc.edu.vn",
    phone: "+84909876543",
  },
  d3: {
    uid: "d3",
    fullName: "BS. Phạm V. Đức",
    specialty: "Thần kinh",
    degree: "Thạc sỹ",
    university: "ĐH Y Hà Nội",
    workplace: "BV Bạch Mai",
    yearsExperience: 12,
    verified: true,
    rating: 4.7,
    email: "duc.pv@bachmai.gov.vn",
    phone: "+84912345678",
  },
  d4: {
    uid: "d4",
    fullName: "BS. Nguyễn Mai",
    specialty: "Tâm lý",
    degree: "Tiến sỹ",
    university: "ĐH Y Hà Nội",
    workplace: "PK Sức khỏe Tinh thần",
    yearsExperience: 20,
    verified: true,
    rating: 4.9,
    email: "mai.n@psyhealth.vn",
    phone: "+84988887777",
  },
};

export function getMockDoctor(id: string): DoctorProfile {
  return (
    DOCTORS[id] ??
    MOCK_DOCTORS_DATA.find((d) => d.uid === id) ?? {
      uid: id,
      fullName: "Bác sỹ",
      specialty: "Đa khoa",
      degree: "Bác sỹ",
      university: "—",
      workplace: "—",
      verified: false,
    }
  );
}
