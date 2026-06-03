import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Section } from "@/components/ui/Segmented";
import { useAuthStore } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { Avatar } from "@/components/ui/Avatar";

const SUGGESTIONS = ["Đau đầu", "Mất ngủ", "Đau bụng", "Sốt", "Ho kéo dài"];

export default function PatientHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [complaint, setComplaint] = useState("");

  const ask = (text?: string) => {
    const q = (text ?? complaint).trim();
    if (!q) return;
    router.push({ pathname: "/(patient)/ai", params: { complaint: q } });
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <AppBar
          title={`Chào ${user?.displayName?.split(" ").slice(-1)[0] ?? "bạn"}`}
          subtitle="Hôm nay bạn thấy thế nào?"
          right={<UserMenu />}
        />

        <Card variant="accent" padding="lg">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
            HỎI HỆ THỐNG
          </Text>
          <Text className="text-base font-bold text-ink mt-1">
            Bạn đang gặp triệu chứng gì?
          </Text>
          <View className="bg-paper border border-line border-dashed rounded-lg px-3 py-2.5 mt-2 min-h-[64px]">
            <TextInput
              multiline
              value={complaint}
              onChangeText={setComplaint}
              placeholder="VD: Tôi hay đau đầu vào nửa đêm…"
              placeholderTextColor="#b5b5b5"
              className="text-sm text-ink"
              style={{ minHeight: 50 }}
            />
          </View>
          <View className="flex-row gap-2 mt-2 justify-between items-center">
            <View className="flex-row gap-2">
              <Chip variant="soft">🎤</Chip>
              <Chip variant="soft">📷</Chip>
              <Chip variant="soft">📎</Chip>
            </View>
            <Pressable
              onPress={() => ask()}
              className="bg-accent border border-accent-ink rounded-lg px-4 py-2"
            >
              <Text className="text-xs font-bold text-ink">Hỏi →</Text>
            </Pressable>
          </View>
        </Card>

        <Section title="Gợi ý nhanh">
          <View className="flex-row flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <Chip key={s} onPress={() => ask(s)}>
                {s}
              </Chip>
            ))}
          </View>
        </Section>

        <View className="flex-row gap-2">
          <Pressable
            onPress={() => router.push({ pathname: "/(patient)/health", params: { tab: "map", action: "goHome" } } as any)}
            className="flex-1"
          >
            <Card variant="soft" padding="md">
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 26 }}>🏠</Text>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-ink">Về nhà</Text>
                  <Text className="text-[10px] text-ink-3">Chỉ đường + đọc to</Text>
                </View>
              </View>
            </Card>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: "/(patient)/health", params: { tab: "map" } } as any)}
            className="flex-1"
          >
            <Card variant="soft" padding="md">
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 26 }}>📍</Text>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-ink">Bản đồ sức khoẻ</Text>
                  <Text className="text-[10px] text-ink-3">Lịch sử di chuyển</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        </View>

        <Section title="Bác sỹ gần đây">
          <Card>
            <View className="flex-row items-center gap-3">
              <Avatar label="Trần Hùng" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-ink">BS. Trần M. Hùng</Text>
                <Text className="text-[11px] text-ink-3">Tim mạch · trả lời 2h trước</Text>
              </View>
              <Pressable
                onPress={() => router.push("/(patient)/chat/demo-doctor-1")}
              >
                <Text className="text-xl text-ink-3">›</Text>
              </Pressable>
            </View>
          </Card>
        </Section>

        <Section title="Sức khỏe hôm nay">
          <View className="flex-row gap-2">
            <Card padding="sm" className="flex-1">
              <Text className="text-[10px] text-ink-3">HUYẾT ÁP</Text>
              <Text className="font-mono font-bold text-lg text-ink">124/80</Text>
              <Text className="text-[10px] text-ink-3">bình thường</Text>
            </Card>
            <Card padding="sm" className="flex-1">
              <Text className="text-[10px] text-ink-3">THUỐC SẮP UỐNG</Text>
              <Text className="text-xs font-bold text-ink mt-1">Amlodipin 5mg</Text>
              <Text className="text-[10px] text-ink-3">trong 35 phút</Text>
            </Card>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
