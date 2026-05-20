import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable,
  Modal, Image, ActivityIndicator, Alert, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { AppBar } from "@/components/AppBar";
import { TopTabs } from "@/components/TopTabs";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Section, Segmented } from "@/components/ui/Segmented";
import { MetricChart } from "@/components/MetricChart";
import { useAuthStore } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import {
  uploadPrescriptionImage,
  subscribeToPrescriptions,
  deletePrescription,
  type PrescriptionPhoto,
} from "@/lib/prescriptions";
import { useRouter } from "expo-router";

const TABS = [
  { key: "info", label: "Thông tin" },
  { key: "meds", label: "Đơn thuốc" },
  { key: "metrics", label: "Chỉ số" },
];

export default function PatientProfile() {
  const router = useRouter();
  const [tab, setTab] = useState("info");

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="px-4 pt-2 gap-2">
        <AppBar
          title="Hồ sơ"
          subtitle="Bệnh nhân"
          right={
            <Pressable onPress={signOut}>
              <Text className="text-xs underline text-ink-3">Đăng xuất</Text>
            </Pressable>
          }
        />
        <TopTabs tabs={TABS} active={tab} onChange={setTab} />
      </View>
      {tab === "info" && <InfoTab />}
      {tab === "meds" && <MedsTab />}
      {tab === "metrics" && <MetricsTab onAdd={() => router.push("/(patient)/ocr/upload?kind=metrics")} />}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Info tab
// ---------------------------------------------------------------------------

function InfoTab() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card variant="accent" padding="md">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="font-bold text-ink">Nguyễn Văn A</Text>
            <Text className="text-[11px] text-ink-3">Nam · 33 tuổi</Text>
          </View>
          <View className="items-end">
            <Text className="font-mono font-bold text-base text-ink">23.0</Text>
            <Text className="text-[10px] text-ink-3">BMI · bình thường</Text>
          </View>
        </View>
      </Card>

      <View className="flex-row gap-2">
        <View className="flex-1"><Input label="Chiều cao" value="172 cm" /></View>
        <View className="flex-1"><Input label="Cân nặng" value="68 kg" /></View>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1"><Input label="Năm sinh" value="1992" /></View>
        <View className="flex-1"><Input label="Nhóm máu" value="O+" /></View>
      </View>

      <Section title="Bệnh nền" action={<Text className="text-[11px] underline text-ink">+ Thêm</Text>}>
        <View className="flex-row flex-wrap gap-1.5">
          <Chip>Tăng huyết áp</Chip>
          <Chip>Tiểu đường II</Chip>
          <Chip variant="soft">+</Chip>
        </View>
      </Section>

      <Section title="Dị ứng">
        <View className="flex-row flex-wrap gap-1.5">
          <Chip>Penicillin</Chip>
          <Chip>Tôm cua</Chip>
          <Chip variant="soft">+</Chip>
        </View>
      </Section>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Meds tab — prescription photo gallery
// ---------------------------------------------------------------------------

function MedsTab() {
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState<PrescriptionPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<PrescriptionPhoto | null>(null);

  // 3 columns: padding 16*2 + gap 8*2 = 48
  const thumbSize = (width - 48) / 3;

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToPrescriptions(user.uid, setPhotos);
  }, [user?.uid]);

  const pickImage = async (fromCamera: boolean) => {
    let result: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("Cần quyền", "Cấp quyền camera để chụp ảnh."); return; }
      result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Cần quyền", "Cấp quyền thư viện ảnh để chọn file."); return; }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
    }
    if (result.canceled || !result.assets?.[0]) return;
    if (!user?.uid) return;

    setUploading(true);
    try {
      await uploadPrescriptionImage(user.uid, result.assets[0].uri);
    } catch {
      Alert.alert("Lỗi upload", "Không thể lưu ảnh. Kiểm tra kết nối và thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (photo: PrescriptionPhoto) => {
    Alert.alert("Xoá đơn thuốc", "Bạn có chắc muốn xoá ảnh này không?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá", style: "destructive",
        onPress: async () => {
          setSelected(null);
          await deletePrescription(photo.id, photo.storageKey);
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* Upload buttons */}
      <View className="flex-row gap-2">
        <Button block onPress={() => pickImage(false)} disabled={uploading}>
          📁 Chọn file
        </Button>
        <Button variant="primary" block onPress={() => pickImage(true)} disabled={uploading}>
          📷 Chụp ảnh
        </Button>
      </View>

      {/* Upload progress */}
      {uploading && (
        <View className="flex-row items-center justify-center gap-2 py-2">
          <ActivityIndicator size="small" />
          <Text className="text-xs text-ink-3">Đang upload…</Text>
        </View>
      )}

      {/* Thumbnail grid */}
      {photos.length === 0 && !uploading ? (
        <View className="items-center py-16 gap-1">
          <Text className="text-sm text-ink-3">Chưa có đơn thuốc nào</Text>
          <Text className="text-[11px] text-ink-4">Chụp hoặc chọn ảnh đơn thuốc để lưu</Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {photos.map((photo) => (
            <View key={photo.id} style={{ width: thumbSize }}>
              <Pressable onPress={() => setSelected(photo)}>
                <Image
                  source={{ uri: photo.imageUrl }}
                  style={{ width: thumbSize, height: thumbSize * 1.35, borderRadius: 8, backgroundColor: "#f1f0ea" }}
                  resizeMode="cover"
                />
              </Pressable>
              {/* Delete button — top-right corner */}
              <Pressable
                onPress={() => deletePrescription(photo.id, photo.storageKey)}
                style={{
                  position: "absolute", top: 4, right: 4,
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, lineHeight: 12 }}>✕</Text>
              </Pressable>
              <Text className="font-mono text-[10px] text-ink-3 mt-0.5">
                {new Date(photo.createdAt).toLocaleDateString("vi-VN")}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Fullscreen modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.93)" }}>
          {/* Top bar */}
          <View
            style={{
              position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
              flexDirection: "row", justifyContent: "space-between",
              alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
            }}
          >
            <Pressable
              onPress={() => selected && confirmDelete(selected)}
              style={{ padding: 8 }}
            >
              <Text style={{ color: "#ff6b6b", fontSize: 13 }}>Xoá</Text>
            </Pressable>
            <Pressable onPress={() => setSelected(null)} style={{ padding: 8 }}>
              <Text style={{ color: "#fff", fontSize: 22, lineHeight: 24 }}>✕</Text>
            </Pressable>
          </View>

          {/* Full image */}
          {selected && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 }}>
              <Image
                source={{ uri: selected.imageUrl }}
                style={{ width: "95%", height: "78%" }}
                resizeMode="contain"
              />
              <Text style={{ color: "#888", fontSize: 11, marginTop: 10, fontFamily: "monospace" }}>
                {new Date(selected.createdAt).toLocaleString("vi-VN")}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Metrics tab
// ---------------------------------------------------------------------------

function MetricsTab({ onAdd }: { onAdd: () => void }) {
  const [chart, setChart] = useState(true);
  const log = [
    ["18/05 · 07:20", "124/80", "sáng"],
    ["16/05 · 21:10", "132/86", "tối"],
    ["15/05 · 08:00", "128/82", "sáng"],
    ["12/05 · 19:30", "135/88", "tối"],
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View className="flex-row gap-2 flex-wrap">
        <Chip variant="accent">Huyết áp</Chip>
        <Chip>Nhịp tim</Chip>
        <Chip>Đường máu</Chip>
        <Chip>Cholesterol</Chip>
        <Chip variant="soft">+</Chip>
      </View>

      <Card padding="md">
        <View className="flex-row justify-between items-center mb-2">
          <View>
            <Text className="font-bold text-ink">Huyết áp</Text>
            <Text className="text-[11px] text-ink-3">30 ngày qua · mmHg</Text>
          </View>
          <Segmented
            value={chart ? "chart" : "list"}
            onChange={(v) => setChart(v === "chart")}
            options={[
              { value: "list", label: "List" },
              { value: "chart", label: "Chart" },
            ]}
          />
        </View>
        {chart ? (
          <>
            <MetricChart
              systolic={[120, 132, 128, 135, 124, 130, 125, 128, 124]}
              diastolic={[78, 86, 82, 88, 80, 84, 78, 82, 80]}
            />
            <View className="flex-row justify-between mt-1">
              <Text className="text-[10px] text-ink-3">
                Tâm thu (xanh) · Tâm trương (đứt)
              </Text>
              <Text className="text-[10px] text-ink-3">TB 128/82</Text>
            </View>
          </>
        ) : (
          <View className="gap-1.5">
            {log.map(([t, v, when]) => (
              <View
                key={t}
                className="flex-row items-center py-1.5 border-b border-dashed border-line-soft"
              >
                <Text className="font-mono text-[11px] text-ink-2" style={{ width: 100 }}>
                  {t}
                </Text>
                <Text className="flex-1 font-mono font-bold text-ink">{v}</Text>
                <Chip variant="soft">{when}</Chip>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Button variant="primary" block leftIcon={<Text>📷</Text>} onPress={onAdd}>
        OCR phiếu xét nghiệm
      </Button>
    </ScrollView>
  );
}
