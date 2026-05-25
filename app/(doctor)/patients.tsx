import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBar } from "@/components/AppBar";
import { UserMenu } from "@/components/UserMenu";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";

const PATIENTS = [
  { n: "Nguyễn Văn A", age: 33, last: "Đau đầu nửa đêm · 10p", cond: ["THA", "ĐTĐ"] },
  { n: "Trần Thị B", age: 45, last: "Hỏi liều Metformin · 1h", cond: ["ĐTĐ"] },
  { n: "Lê Văn C", age: 58, last: "HA cao 150/95 · 3h", cond: ["THA"] },
  { n: "Phan T. D", age: 29, last: "Mất ngủ · hôm qua", cond: [] },
  { n: "Hoàng M. E", age: 41, last: "XN máu mới · 2 ngày", cond: ["Mỡ máu"] },
];

export default function DoctorPatients() {
  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title="Bệnh nhân" subtitle={`${PATIENTS.length} đang theo dõi`} right={<UserMenu />} />
        <Input placeholder="Tìm theo tên, mã BN…" />
        <View className="flex-row gap-1.5 flex-wrap">
          <Chip variant="accent">Tất cả</Chip>
          <Chip variant="soft">Mới</Chip>
          <Chip variant="soft">Cần trả lời</Chip>
          <Chip variant="soft">Lịch hẹn</Chip>
        </View>
        <View className="gap-1.5">
          {PATIENTS.map((p) => (
            <Card key={p.n} padding="md">
              <View className="flex-row items-center gap-3">
                <Avatar label={p.n} />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-ink">
                    {p.n} <Text className="text-ink-3">· {p.age}t</Text>
                  </Text>
                  <Text className="text-[11px] text-ink-3" numberOfLines={1}>
                    {p.last}
                  </Text>
                  <View className="flex-row gap-1 mt-1">
                    {p.cond.map((c) => (
                      <Chip key={c} variant="soft">
                        {c}
                      </Chip>
                    ))}
                  </View>
                </View>
                <Text className="text-base text-ink-3">›</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
