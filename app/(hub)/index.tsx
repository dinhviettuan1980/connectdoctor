import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { EXTERNAL_APPS } from "@/lib/externalApps";

export default function AppHub() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View className="mt-2 mb-1">
          <Text className="text-2xl font-bold tracking-tight text-ink">TuanDV Apps</Text>
          <Text className="text-xs text-ink-3 mt-1">Chọn một ứng dụng để bắt đầu</Text>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <Pressable
            className="w-[47%]"
            onPress={() => router.push("/(auth)/sign-in" as any)}
          >
            <Card variant="accent" padding="lg" className="items-center gap-1.5">
              <Text style={{ fontSize: 28 }}>🩺</Text>
              <Text className="text-xs font-bold text-accent-ink text-center">ConnectDoctor</Text>
            </Card>
          </Pressable>

          {EXTERNAL_APPS.map((app) => (
            <Pressable
              key={app.slug}
              className="w-[47%]"
              onPress={() => router.push(`/(hub)/${app.slug}` as any)}
            >
              <Card padding="lg" className="items-center gap-1.5">
                <Text style={{ fontSize: 28 }}>{app.icon}</Text>
                <Text className="text-xs font-bold text-ink text-center">{app.title}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
