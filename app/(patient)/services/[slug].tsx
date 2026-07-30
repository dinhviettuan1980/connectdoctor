import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { AppBar } from "@/components/AppBar";
import { getExternalApp } from "@/lib/externalApps";

export default function ExternalAppScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const app = getExternalApp(slug ?? "");
  const [loading, setLoading] = useState(true);

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
      <View className="flex-1">
        <WebView
          source={{ uri: app.url }}
          basicAuthCredential={app.basicAuth}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          startInLoadingState
          style={{ flex: 1 }}
        />
        {loading && (
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center bg-paper"
          >
            <ActivityIndicator />
            <Text className="text-xs text-ink-3 mt-2">Đang tải {app.title}…</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
