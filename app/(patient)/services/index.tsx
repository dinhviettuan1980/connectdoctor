import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { EXTERNAL_APPS } from "@/lib/externalApps";

export default function ServicesHub() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title="Dịch vụ khác" subtitle="Các ứng dụng khác của bạn" back />

        <View className="flex-row flex-wrap gap-3">
          {EXTERNAL_APPS.map((app) => (
            <Pressable
              key={app.slug}
              className="w-[47%]"
              onPress={() => router.push(`/(patient)/services/${app.slug}` as any)}
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
