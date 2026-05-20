import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useState } from "react";

// Mock doctor list — replace with Firestore query filtered by specialty.
const MOCK_DOCTORS = [
  { id: "demo-doctor-1", name: "BS. Trần Minh Hùng", spec: "Thần kinh", yrs: 15, rating: 4.9, status: "online" },
  { id: "d2", name: "BS. Lê Thị Hoa", spec: "Nội tổng quát", yrs: 8, rating: 4.8, status: "free" },
  { id: "d3", name: "BS. Phạm V. Đức", spec: "Thần kinh", yrs: 12, rating: 4.7, status: "busy" },
  { id: "d4", name: "BS. Nguyễn Mai", spec: "Tâm lý", yrs: 20, rating: 4.9, status: "online" },
];

export default function AiResult() {
  const router = useRouter();
  const { specialties, conditions } = useLocalSearchParams<{
    specialties: string;
    conditions: string;
  }>();
  const [sort, setSort] = useState<"match" | "online" | "near">("match");

  const specs = (specialties ?? "Thần kinh").split(",").filter(Boolean);
  const conds = (conditions ?? "").split(",").filter(Boolean);

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
            Bác sỹ gợi ý ({MOCK_DOCTORS.length})
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

        <View className="gap-2">
          {MOCK_DOCTORS.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => router.push(`/(patient)/chat/doctor/${d.id}`)}
            >
              <Card padding="md">
                <View className="flex-row items-center gap-3">
                  <Avatar label={d.name} size="lg" />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-ink">{d.name}</Text>
                    <Text className="text-[11px] text-ink-3">
                      {d.spec} · {d.yrs}n KN
                    </Text>
                    <View className="flex-row gap-1.5 mt-1 items-center">
                      <Chip variant={d.status === "online" ? "accent" : "soft"}>
                        {d.status === "online" ? "online" : d.status === "free" ? "rảnh" : "bận"}
                      </Chip>
                      <Text className="text-[11px] text-ink-3">★ {d.rating}</Text>
                    </View>
                  </View>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => router.push(`/(patient)/chat/${d.id}`)}
                  >
                    Chat
                  </Button>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
