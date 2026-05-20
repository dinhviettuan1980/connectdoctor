import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AppBar } from "@/components/AppBar";
import { Divider } from "@/components/ui/Segmented";
import { signInWithEmail, signInWithGoogle, signInWithFacebook } from "@/lib/auth";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const doSignIn = async () => {
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (e: any) {
      Alert.alert("Đăng nhập thất bại", e?.message ?? "Sai email/mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <AppBar title="Đăng nhập" back />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="ban@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        <Button variant="primary" block loading={loading} onPress={doSignIn}>
          Đăng nhập
        </Button>

        <View className="flex-row items-center gap-2 my-2">
          <View className="flex-1"><Divider /></View>
          <Text className="text-xs text-ink-3">hoặc</Text>
          <View className="flex-1"><Divider /></View>
        </View>

        <Button block onPress={() => signInWithGoogle().catch((e) => Alert.alert("Lỗi", e.message))}>
          Tiếp tục với Google
        </Button>
        <Button block onPress={() => signInWithFacebook().catch((e) => Alert.alert("Lỗi", e.message))}>
          Tiếp tục với Facebook
        </Button>

        <Text
          className="text-xs text-center text-ink-3 mt-2"
          onPress={() => router.replace("/(auth)/role-select")}
        >
          Chưa có tài khoản? <Text className="underline text-ink">Đăng ký</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
