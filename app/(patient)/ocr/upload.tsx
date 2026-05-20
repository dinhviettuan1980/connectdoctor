import { useState } from "react";
import { View, Text, Pressable, Image, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/Note";

export default function OcrUpload() {
  const router = useRouter();
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const [imageUri, setImageUri] = useState<string | null>(null);

  const title = kind === "metrics" ? "Thêm chỉ số từ ảnh" : "Thêm thuốc từ ảnh";

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Cần quyền", "Cấp quyền thư viện ảnh để tiếp tục.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) setImageUri(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Cần quyền", "Cấp quyền camera để tiếp tục.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) setImageUri(res.assets[0].uri);
  };

  const goReview = () => {
    if (!imageUri) return;
    router.push({
      pathname: "/(patient)/ocr/review",
      params: { uri: imageUri, kind: kind ?? "meds" },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title={title} subtitle="Bước 1/3 · Upload" back />

        <Card variant="soft" padding="lg">
          <Pressable
            onPress={pickFromLibrary}
            className="items-center justify-center"
            style={{ minHeight: 160 }}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: 220, borderRadius: 8 }}
                resizeMode="contain"
              />
            ) : (
              <Text className="font-mono text-[11px] text-ink-3">
                Tap để chọn ảnh / chụp đơn thuốc
              </Text>
            )}
          </Pressable>
          <View className="flex-row gap-2 justify-center mt-3">
            <Button size="sm" onPress={pickFromLibrary}>📁 Thư viện</Button>
            <Button size="sm" variant="primary" onPress={takePhoto}>📷 Chụp</Button>
          </View>
        </Card>

        <Note>Hệ thống tự nhận dạng tên thuốc, liều, tần suất — bạn chỉ cần xác nhận.</Note>

        <Button variant="primary" block disabled={!imageUri} onPress={goReview}>
          Tiếp tục →
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
