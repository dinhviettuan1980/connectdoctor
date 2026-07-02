import { useState } from "react";
import { View, Text, ScrollView, Platform } from "react-native";
import { Alert } from "@/lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AppBar } from "@/components/AppBar";
import { Divider } from "@/components/ui/Segmented";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { signUpWithEmail, loadOrInitUserDoc } from "@/lib/auth";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { useFacebookSignIn } from "@/hooks/useFacebookSignIn";
import { useAuthStore } from "@/hooks/useAuth";
import { SocialIconButton } from "@/components/SocialIconButton";

export default function SignUp() {
  const router = useRouter();
  const pendingRole = useAuthStore((s) => s.pendingRole) ?? "patient";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const doSignUp = async () => {
    setLoading(true);
    try {
      await signUpWithEmail(email, password, pendingRole, name);
      // _layout AuthGate will redirect on user change.
    } catch (e: any) {
      Alert.alert("Đăng ký thất bại", e?.message ?? "Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const { signIn: googleSignIn } = useGoogleSignIn(
    async (fbUser) => { await loadOrInitUserDoc(fbUser, pendingRole); },
    (e) => Alert.alert("Lỗi", e.message),
  );

  const { signIn: facebookSignIn } = useFacebookSignIn(
    async (fbUser) => { await loadOrInitUserDoc(fbUser, pendingRole); },
    (e) => Alert.alert("Lỗi", e.message),
  );

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <AppBar title="Đăng ký" subtitle={`Vai trò: ${pendingRole === "doctor" ? "Bác sỹ" : "Bệnh nhân"}`} back />

        <Card variant="soft" padding="sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-ink-3">Bạn đang đăng ký với vai trò:</Text>
            <Chip variant="accent">{pendingRole === "doctor" ? "Bác sỹ" : "Bệnh nhân"}</Chip>
          </View>
        </Card>

        <Input label="Họ tên" value={name} onChangeText={setName} placeholder="Nguyễn Văn A" />
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

        <Button variant="primary" block loading={loading} onPress={doSignUp}>
          Tạo tài khoản
        </Button>

        <View className="flex-row items-center gap-2 my-2">
          <View className="flex-1"><Divider /></View>
          <Text className="text-xs text-ink-3">hoặc</Text>
          <View className="flex-1"><Divider /></View>
        </View>

        <View className="flex-row items-center justify-center gap-4 mt-1">
          <SocialIconButton provider="google" onPress={googleSignIn} />
          <SocialIconButton provider="facebook" onPress={facebookSignIn} />
        </View>

        <Text
          className="text-xs text-center text-ink-3 mt-2"
          onPress={() => router.replace("/(auth)/sign-in")}
        >
          Đã có tài khoản? <Text className="underline text-ink">Đăng nhập</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
