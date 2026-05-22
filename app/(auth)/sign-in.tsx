import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AppBar } from "@/components/AppBar";
import { Divider } from "@/components/ui/Segmented";
import { signInWithEmail, loadOrInitUserDoc } from "@/lib/auth";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { useFacebookSignIn } from "@/hooks/useFacebookSignIn";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { signIn: googleSignIn } = useGoogleSignIn(
    async (fbUser) => { await loadOrInitUserDoc(fbUser); },
    (e) => setError(e.message),
  );

  const { signIn: facebookSignIn } = useFacebookSignIn(
    async (fbUser) => { await loadOrInitUserDoc(fbUser); },
    (e) => setError(e.message),
  );

  const doSignIn = async () => {
    setError("");
    setLoading(true);
    const resolvedEmail = email.includes("@") ? email : `${email}@connectdoctor.app`;
    try {
      await signInWithEmail(resolvedEmail, password);
    } catch (e: any) {
      setError(e?.message ?? "Sai email hoặc mật khẩu.");
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

        {error ? (
          <Text className="text-sm text-danger text-center">{error}</Text>
        ) : null}

        <Button variant="primary" block loading={loading} onPress={doSignIn}>
          Đăng nhập
        </Button>

        <View className="flex-row items-center gap-2 my-2">
          <View className="flex-1"><Divider /></View>
          <Text className="text-xs text-ink-3">hoặc</Text>
          <View className="flex-1"><Divider /></View>
        </View>

        <Button block onPress={googleSignIn}>
          Tiếp tục với Google
        </Button>

        <Button block onPress={facebookSignIn}>
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
