import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBar } from "@/components/AppBar";
import { UserMenu } from "@/components/UserMenu";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

const EVENTS = [
  { d: "18/05", k: "Huyết áp", v: "124/80", tag: "tay" as const },
  { d: "12/05", k: "Cập nhật đơn thuốc (5)", v: "Aspirin + 1", tag: "OCR" as const },
  { d: "10/05", k: "XN máu (8 chỉ số)", v: "HbA1c 6.4", tag: "OCR" as const },
  { d: "05/05", k: "XN nước tiểu", v: "pH 6.0", tag: "OCR" as const },
  { d: "02/05", k: "Đường máu", v: "5.4 mmol/L", tag: "tay" as const },
];

export default function History() {
  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title="Lịch sử sức khỏe" subtitle="Tất cả các thay đổi" right={<UserMenu />} />
        <View className="flex-row gap-1.5 flex-wrap">
          <Chip variant="accent">Tất cả</Chip>
          <Chip variant="soft">Thuốc</Chip>
          <Chip variant="soft">Huyết áp</Chip>
          <Chip variant="soft">Máu</Chip>
          <Chip variant="soft">Nước tiểu</Chip>
        </View>
        <View className="gap-1.5">
          {EVENTS.map((e) => (
            <Card key={`${e.d}-${e.k}`} padding="md">
              <View className="flex-row justify-between">
                <Text className="font-mono text-[11px] font-bold text-ink">{e.d}/2026</Text>
                <Chip variant={e.tag === "OCR" ? "accent" : "soft"}>{e.tag}</Chip>
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-xs text-ink flex-1">{e.k}</Text>
                <Text className="text-xs font-mono font-bold text-ink-2">{e.v}</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
