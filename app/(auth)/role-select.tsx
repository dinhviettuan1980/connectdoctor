import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/hooks/useAuth";
import type { Role } from "@/lib/types";

export default function RoleSelect() {
  const router = useRouter();
  const setPendingRole = useAuthStore((s) => s.setPendingRole);
  const pendingRole = useAuthStore((s) => s.pendingRole);

  const pick = (r: Role) => {
    setPendingRole(r);
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="flex-1 px-5 py-6 gap-5">
        <View className="flex-row justify-between items-center">
          <Text className="font-mono text-[10px] font-bold tracking-widest text-ink-2">
            CONNECTDOCTOR
          </Text>
          <Text className="text-[10px] text-ink-3">v0.1</Text>
        </View>

        <View className="mt-6">
          <Text className="text-xl font-bold leading-tight text-ink">
            Chọn vai trò{"\n"}của bạn để bắt đầu.
          </Text>
          <Text className="text-xs text-ink-3 mt-2">
            Bạn có thể đổi vai trò trong Cài đặt sau này.
          </Text>
        </View>

        <Pressable onPress={() => pick("patient")}>
          <Card variant={pendingRole === "patient" ? "accent" : "default"} padding="lg">
            <View className="flex-row items-center gap-3">
              <Avatar label="BN" size="lg" square />
              <View className="flex-1">
                <Text className="font-bold text-ink">Tôi là bệnh nhân</Text>
                <Text className="text-xs text-ink-3 mt-0.5">
                  Theo dõi sức khỏe, hỏi & chat với bác sỹ.
                </Text>
              </View>
              <Text className="text-xl text-ink-3">›</Text>
            </View>
          </Card>
        </Pressable>

        <Pressable onPress={() => pick("doctor")}>
          <Card variant={pendingRole === "doctor" ? "accent" : "default"} padding="lg">
            <View className="flex-row items-center gap-3">
              <Avatar label="BS" size="lg" square />
              <View className="flex-1">
                <Text className="font-bold text-ink">Tôi là bác sỹ</Text>
                <Text className="text-xs text-ink-3 mt-0.5">
                  Tư vấn, quản lý bệnh nhân, kê khai bằng cấp.
                </Text>
              </View>
              <Text className="text-xl text-ink-3">›</Text>
            </View>
          </Card>
        </Pressable>

        <View className="mt-auto gap-2">
          <Button
            variant="primary"
            block
            disabled={!pendingRole}
            onPress={() => router.push("/(auth)/sign-up")}
          >
            Tạo tài khoản →
          </Button>
          <Pressable onPress={() => router.push("/(auth)/sign-in")} className="py-2">
            <Text className="text-xs text-center text-ink-3">
              Đã có tài khoản? <Text className="underline text-ink">Đăng nhập</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
