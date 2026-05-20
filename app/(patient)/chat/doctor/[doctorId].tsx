import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Segmented";
import { getMockDoctor } from "@/lib/mockDoctors";
import { openEmail, openPhone } from "@/lib/linking";

export default function DoctorProfileView() {
  const router = useRouter();
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const d = getMockDoctor(doctorId ?? "");

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title="Hồ sơ bác sỹ" back />

        <Card padding="lg" className="items-center">
          <Avatar label={d.fullName} size="xl" />
          <Text className="font-bold text-ink text-base mt-2">{d.fullName}</Text>
          <Text className="text-xs text-ink-3">
            {d.degree} · {d.specialty} · {d.workplace}
          </Text>
          <View className="flex-row gap-1.5 mt-2 flex-wrap justify-center">
            {d.verified && <Chip variant="accent">✓ Xác minh</Chip>}
            {d.rating && <Chip variant="soft">★ {d.rating}</Chip>}
            {d.yearsExperience && <Chip variant="soft">{d.yearsExperience}n KN</Chip>}
          </View>
        </Card>

        <Section title="Liên hệ nhanh">
          <Card variant="soft" padding="md">
            {d.email && (
              <Pressable
                onPress={() => openEmail(d.email!, "Hỏi tư vấn từ ConnectDoctor")}
                className="flex-row justify-between items-center py-2 border-b border-dashed border-line-soft"
              >
                <View className="flex-row items-center gap-2">
                  <Text>✉</Text>
                  <Text className="text-xs underline text-ink">{d.email}</Text>
                </View>
                <Text className="text-[11px] text-ink-3">soạn email →</Text>
              </Pressable>
            )}
            {d.phone && (
              <Pressable
                onPress={() => openPhone(d.phone!)}
                className="flex-row justify-between items-center py-2"
              >
                <View className="flex-row items-center gap-2">
                  <Text>📞</Text>
                  <Text className="text-xs text-ink">{d.phone}</Text>
                </View>
                <Text className="text-[11px] text-ink-3">gọi ngay →</Text>
              </Pressable>
            )}
          </Card>
        </Section>

        <Section title="Lịch hoạt động">
          <View className="flex-row gap-1.5">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
              <View key={d} className="flex-1 items-center">
                <Text className="text-[10px] text-ink-3">{d}</Text>
                <View
                  className={[
                    "w-3 h-3 rounded mt-1.5",
                    [1, 2, 4].includes(i) ? "bg-accent-ink" : "bg-line-soft",
                  ].join(" ")}
                />
              </View>
            ))}
          </View>
        </Section>

        <Button
          variant="primary"
          block
          onPress={() => router.push(`/(patient)/chat/${d.uid}`)}
        >
          💬 Bắt đầu chat
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
