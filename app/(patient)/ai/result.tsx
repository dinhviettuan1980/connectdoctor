import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { MOCK_DOCTORS_DATA } from "@/lib/mockDoctorsData";
import { haversineKm, HANOI_CENTER } from "@/lib/geo";
import { openPhone } from "@/lib/linking";
import { useAuthStore } from "@/hooks/useAuth";
import { getPatientProfile } from "@/lib/patientProfile";
import { getCurrentLocation } from "@/lib/locationTracking";
import type { DoctorProfile } from "@/lib/types";

const RESULT_LIMIT = 30;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function matchesSpecialty(doctor: DoctorProfile, specs: string[]): boolean {
  const spec = normalize(doctor.specialty);
  return specs.some((s) => {
    const n = normalize(s);
    return spec.includes(n) || n.includes(spec);
  });
}

// Stable pseudo online-status derived from uid — no live presence backend yet.
function pseudoStatus(uid: string): "online" | "free" | "busy" {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  const bucket = h % 3;
  return bucket === 0 ? "online" : bucket === 1 ? "free" : "busy";
}

export default function AiResult() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { specialties, conditions } = useLocalSearchParams<{
    specialties: string;
    conditions: string;
  }>();
  const [sort, setSort] = useState<"match" | "online" | "near">("match");
  const [origin, setOrigin] = useState<{ lat: number; lng: number }>(HANOI_CENTER);
  const [originLabel, setOriginLabel] = useState("Hà Nội (mặc định)");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Prefer live GPS; fall back to saved home address; else Hanoi center.
      const live = await getCurrentLocation();
      if (cancelled) return;
      if (live) {
        setOrigin(live);
        setOriginLabel("vị trí hiện tại");
        return;
      }
      if (!user) return;
      const p = await getPatientProfile(user.uid).catch(() => null);
      if (cancelled || !p?.homeAddress) return;
      setOrigin({ lat: p.homeAddress.lat, lng: p.homeAddress.lng });
      setOriginLabel("địa chỉ nhà");
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const specs = (specialties ?? "Thần kinh").split(",").filter(Boolean);
  const conds = (conditions ?? "").split(",").filter(Boolean);

  const doctors = useMemo(() => {
    const matched = MOCK_DOCTORS_DATA.filter((d) => matchesSpecialty(d, specs));
    const pool = matched.length > 0 ? matched : MOCK_DOCTORS_DATA;

    const withDistance = pool.map((d) => ({
      ...d,
      distanceKm:
        d.lat != null && d.lng != null
          ? haversineKm(origin.lat, origin.lng, d.lat, d.lng)
          : null,
    }));

    const sorted = [...withDistance].sort((a, b) => {
      if (sort === "near") {
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      }
      if (sort === "online") {
        const rank = { online: 0, free: 1, busy: 2 };
        const sa = rank[pseudoStatus(a.uid)];
        const sb = rank[pseudoStatus(b.uid)];
        if (sa !== sb) return sa - sb;
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      // match: highest rating first among specialty-matched doctors
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

    return sorted.slice(0, RESULT_LIMIT);
  }, [specs, sort, origin]);

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title="Kết quả" subtitle="AI phân tích · trả lời các câu hỏi" back />

        <Card variant="accent" padding="md">
          <Text className="text-[10px] uppercase tracking-wider text-ink-3">
            CÓ THỂ LIÊN QUAN
          </Text>
          <View className="flex-row gap-1.5 flex-wrap mt-1.5">
            {conds.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </View>
          <Text className="text-[11px] text-ink-3 mt-2">
            Đề xuất chuyên khoa:{" "}
            {specs.map((s, i) => (
              <Text key={s} className="font-bold text-ink">
                {s}
                {i < specs.length - 1 ? " · " : ""}
              </Text>
            ))}
          </Text>
        </Card>

        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
            Bác sỹ gợi ý ({doctors.length})
          </Text>
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { value: "match", label: "Phù hợp" },
              { value: "online", label: "Online" },
              { value: "near", label: "Gần" },
            ]}
          />
        </View>
        {sort === "near" && (
          <Text className="text-[11px] text-ink-3 -mt-2">
            Khoảng cách tính từ {originLabel}
          </Text>
        )}

        <View className="gap-2">
          {doctors.map((d) => {
            const status = pseudoStatus(d.uid);
            return (
              <Pressable
                key={d.uid}
                onPress={() => router.push(`/(patient)/chat/doctor/${d.uid}`)}
              >
                <Card padding="md">
                  <View className="flex-row items-center gap-3">
                    <Avatar label={d.fullName} size="lg" />
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-ink">{d.fullName}</Text>
                      <Text className="text-[11px] text-ink-3">
                        {d.specialty} · {d.workplace}
                      </Text>
                      <Text className="text-[11px] text-ink-3" numberOfLines={1}>
                        {d.address}
                      </Text>
                      <View className="flex-row gap-1.5 mt-1 items-center flex-wrap">
                        <Chip variant={status === "online" ? "accent" : "soft"}>
                          {status === "online" ? "online" : status === "free" ? "rảnh" : "bận"}
                        </Chip>
                        <Text className="text-[11px] text-ink-3">★ {d.rating}</Text>
                        {d.distanceKm != null && (
                          <Text className="text-[11px] text-ink-3 font-mono">
                            {d.distanceKm.toFixed(1)} km
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <View className="flex-row gap-2 mt-3">
                    <View className="flex-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        block
                        onPress={() => d.phone && openPhone(d.phone)}
                        disabled={!d.phone}
                      >
                        📞 Gọi
                      </Button>
                    </View>
                    <View className="flex-1">
                      <Button
                        variant="primary"
                        size="sm"
                        block
                        onPress={() => router.push(`/(patient)/chat/${d.uid}`)}
                      >
                        💬 Chat
                      </Button>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
