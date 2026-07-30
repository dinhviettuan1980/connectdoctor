import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { getExternalApp } from "@/lib/externalApps";

export default function ExternalAppScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const app = getExternalApp(slug ?? "");

  if (!app) {
    return (
      <SafeAreaView className="flex-1 bg-paper items-center justify-center px-8">
        <AppBar title="Không tìm thấy" back />
        <Text className="text-sm text-ink-3 mt-2">Không có dịch vụ này.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <AppBar title={app.title} back />
      <View style={{ flex: 1 }}>
        {/* @ts-ignore - iframe is fine in RN-Web */}
        <iframe
          src={app.url}
          style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
          title={app.title}
        />
      </View>
    </SafeAreaView>
  );
}
