import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

export default function OcrConfirm() {
  const router = useRouter();
  const { kind, count } = useLocalSearchParams<{ kind: string; count?: string }>();
  const isMeds = kind !== "metrics";
  const n = Number(count) || 0;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="flex-1 px-6 items-center justify-center gap-5">
        <Avatar label="✓" size="xl" square />
        <View className="items-center">
          <Text className="text-lg font-bold text-ink">
            {isMeds ? "Đã lưu đơn thuốc" : "Đã lưu chỉ số"}
          </Text>
          <Text className="text-xs text-ink-3 mt-1">
            Bản ghi mới · {new Date().toLocaleDateString("vi-VN")}
          </Text>
        </View>

        <Card variant="soft" padding="md" style={{ width: "100%" }}>
          <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">TÓM TẮT</Text>
          {isMeds ? (
            <Text className="text-xs text-ink">Đã lưu {n} thuốc vào đơn thuốc mới.</Text>
          ) : (
            <Text className="text-xs text-ink">Đã thêm {n} chỉ số xét nghiệm vào hồ sơ.</Text>
          )}
        </Card>

        <View className="w-full gap-2">
          <Button
            variant="primary"
            block
            onPress={() => router.replace("/(patient)/profile")}
          >
            Xem hồ sơ
          </Button>
          <Button variant="ghost" block onPress={() => router.replace("/(patient)/home")}>
            Về trang chủ
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
