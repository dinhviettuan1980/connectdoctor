import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Section } from "@/components/ui/Segmented";
import { useAuthStore } from "@/hooks/useAuth";

export default function DoctorHome() {
  const user = useAuthStore((s) => s.user);
  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar
          title={`BS. ${user?.displayName?.split(" ").slice(-1)[0] ?? ""}`}
          subtitle="Tổng quan hôm nay"
          right={<Avatar label={user?.displayName ?? "BS"} />}
        />

        <View className="flex-row gap-2">
          <Card padding="sm" className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider text-ink-3">Tin nhắn mới</Text>
            <Text className="font-mono font-bold text-2xl text-ink">7</Text>
          </Card>
          <Card padding="sm" className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider text-ink-3">Lịch hẹn</Text>
            <Text className="font-mono font-bold text-2xl text-ink">3</Text>
          </Card>
          <Card padding="sm" className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider text-ink-3">BN đang theo</Text>
            <Text className="font-mono font-bold text-2xl text-ink">42</Text>
          </Card>
        </View>

        <Section title="Bệnh nhân chờ trả lời">
          <View className="gap-1.5">
            {[
              { n: "Nguyễn Văn A", s: "Đau đầu nửa đêm", t: "10 phút", urg: true },
              { n: "Trần T. B", s: "Hỏi liều Metformin", t: "1 giờ" },
              { n: "Lê V. C", s: "Báo HA tăng", t: "3 giờ" },
            ].map((p) => (
              <Card key={p.n} padding="md">
                <View className="flex-row items-center gap-3">
                  <Avatar label={p.n} />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-ink">{p.n}</Text>
                    <Text className="text-[11px] text-ink-3" numberOfLines={1}>
                      {p.s}
                    </Text>
                  </View>
                  <View className="items-end">
                    {p.urg && <Chip variant="accent">mới</Chip>}
                    <Text className="text-[10px] text-ink-3 mt-1">{p.t}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </Section>

        <Section title="Lịch hôm nay">
          <Card padding="md">
            {[
              ["09:00", "Nguyễn V. A", "Tái khám"],
              ["14:30", "Phan T. D", "Tư vấn online"],
              ["16:00", "Hoàng M. E", "Đọc kết quả XN"],
            ].map(([t, n, k]) => (
              <View
                key={t}
                className="flex-row items-center justify-between py-1.5 border-b border-dashed border-line-soft"
              >
                <Text className="font-mono text-xs font-bold text-ink">{t}</Text>
                <Text className="flex-1 text-xs text-ink ml-3">{n}</Text>
                <Chip variant="soft">{k}</Chip>
              </View>
            ))}
          </Card>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
