import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  Modal, Image, ActivityIndicator, Alert, useWindowDimensions,
  KeyboardAvoidingView, Platform,
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
  createPrescription,
  updatePrescriptionNote,
  addImageToPrescription,
  removeImageFromPrescription,
  deletePrescription,
  subscribeToPrescriptions,
  type Prescription,
  type PrescriptionImage,
} from "@/lib/prescriptions";
import { useRouter } from "expo-router";

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

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
// Meds tab — prescription list with CRUD
// ---------------------------------------------------------------------------

function MedsTab() {
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // 3 columns inside detail modal (modal width ≈ screen width, same padding)
  const thumbSize = (width - 48) / 3;

  // Derive selected from live list so it auto-updates after photo add/remove
  const selected = prescriptions.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToPrescriptions(user.uid, setPrescriptions);
  }, [user?.uid]);

  // ── Create ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!user?.uid || creating) return;
    setCreating(true);
    try {
      const id = await createPrescription(user.uid);
      setSelectedId(id); // open detail immediately
    } catch {
      Alert.alert("Lỗi", "Không thể tạo đơn thuốc.");
    } finally {
      setCreating(false);
    }
  };

  // ── Delete prescription ──────────────────────────────────────────────────
  const handleDeletePrescription = (p: Prescription) => {
    Alert.alert("Xoá đơn thuốc", `Xoá đơn ngày ${formatDateTime(p.createdAt)}?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá", style: "destructive",
        onPress: async () => {
          if (selectedId === p.id) setSelectedId(null);
          await deletePrescription(p);
        },
      },
    ]);
  };

  // ── Add image inside detail modal ────────────────────────────────────────
  const handleAddImage = async (fromCamera: boolean) => {
    if (!user?.uid || !selectedId) return;
    let result: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("Cần quyền", "Cấp quyền camera."); return; }
      result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Cần quyền", "Cấp quyền thư viện ảnh."); return; }
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
    }
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      await addImageToPrescription(selectedId, user.uid, result.assets[0].uri);
    } catch {
      Alert.alert("Lỗi", "Upload ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* Create button */}
      <Button variant="primary" block onPress={handleCreate} loading={creating}>
        + Tạo đơn thuốc mới
      </Button>

      {/* Empty state */}
      {prescriptions.length === 0 && (
        <View className="items-center py-16 gap-1">
          <Text className="text-sm text-ink-3">Chưa có đơn thuốc nào</Text>
          <Text className="text-[11px] text-ink-4">Bấm "Tạo đơn thuốc mới" để bắt đầu</Text>
        </View>
      )}

      {/* Prescription list */}
      {prescriptions.map((p) => (
        <Card key={p.id} padding="md">
          {/* Header row */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-mono text-xs font-bold text-ink">
              {formatDateTime(p.createdAt)}
            </Text>
            <View className="flex-row gap-3">
              <Pressable onPress={() => setSelectedId(p.id)}>
                <Text className="text-xs text-accent-ink">Mở</Text>
              </Pressable>
              <Pressable onPress={() => handleDeletePrescription(p)}>
                <Text className="text-xs text-danger">Xoá</Text>
              </Pressable>
            </View>
          </View>

          {/* Note preview */}
          {!!p.note && (
            <Text className="text-[11px] text-ink-3 mb-2" numberOfLines={1}>{p.note}</Text>
          )}

          {/* Photo thumbnails preview (max 4) */}
          {p.images.length > 0 ? (
            <View className="flex-row gap-1.5">
              {p.images.slice(0, 4).map((img, i) => (
                <View key={img.storageKey} style={{ position: "relative" }}>
                  <Image
                    source={{ uri: img.url }}
                    style={{ width: 52, height: 68, borderRadius: 6, backgroundColor: "#f1f0ea" }}
                    resizeMode="cover"
                  />
                  {i === 3 && p.images.length > 4 && (
                    <View style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 6,
                      backgroundColor: "rgba(0,0,0,0.45)",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>
                        +{p.images.length - 4}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-[11px] text-ink-4">Chưa có ảnh</Text>
          )}
        </Card>
      ))}

      {/* ── Detail modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelectedId(null)}
      >
        <SafeAreaView className="flex-1 bg-paper">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {/* Top bar */}
              <View className="flex-row items-center justify-between">
                <Text className="font-mono text-xs font-bold text-ink">
                  {selected ? formatDateTime(selected.createdAt) : ""}
                </Text>
                <Pressable onPress={() => setSelectedId(null)} className="p-1">
                  <Text className="text-base text-ink-2">✕ Đóng</Text>
                </Pressable>
              </View>

              {/* Note editor */}
              <NoteEditor
                key={selected?.id}
                initialNote={selected?.note ?? ""}
                onSave={(note) => selected && updatePrescriptionNote(selected.id, note)}
              />

              {/* Photos section */}
              <Text className="text-[10px] uppercase tracking-wider text-ink-3 mt-1">
                Ảnh đơn thuốc ({selected?.images.length ?? 0})
              </Text>

              {uploading && (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" />
                  <Text className="text-xs text-ink-3">Đang upload…</Text>
                </View>
              )}

              {/* Photo grid */}
              <View className="flex-row flex-wrap gap-2">
                {selected?.images.map((img) => (
                  <View key={img.storageKey} style={{ width: thumbSize }}>
                    <Pressable onPress={() => setViewImage(img.url)}>
                      <Image
                        source={{ uri: img.url }}
                        style={{ width: thumbSize, height: thumbSize * 1.35, borderRadius: 8, backgroundColor: "#f1f0ea" }}
                        resizeMode="cover"
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => selected && removeImageFromPrescription(selected.id, img)}
                      style={{
                        position: "absolute", top: 4, right: 4,
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: "rgba(0,0,0,0.55)",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 11, lineHeight: 12 }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>

              {/* Add photo buttons */}
              <View className="flex-row gap-2">
                <Button block onPress={() => handleAddImage(false)} disabled={uploading}>
                  📁 Chọn file
                </Button>
                <Button variant="primary" block onPress={() => handleAddImage(true)} disabled={uploading}>
                  📷 Chụp ảnh
                </Button>
              </View>

              {/* Delete prescription */}
              {selected && (
                <Button
                  variant="danger"
                  block
                  onPress={() => { handleDeletePrescription(selected); }}
                >
                  Xoá đơn thuốc này
                </Button>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── Fullscreen image viewer ───────────────────────────────────────── */}
      <Modal visible={!!viewImage} transparent animationType="fade" onRequestClose={() => setViewImage(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.93)", alignItems: "center", justifyContent: "center" }}>
          <Pressable
            onPress={() => setViewImage(null)}
            style={{ position: "absolute", top: 52, right: 20, padding: 8 }}
          >
            <Text style={{ color: "#fff", fontSize: 22 }}>✕</Text>
          </Pressable>
          {viewImage && (
            <Image source={{ uri: viewImage }} style={{ width: "95%", height: "80%" }} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

// Controlled note editor — local state, saves on blur or button press
function NoteEditor({ initialNote, onSave }: { initialNote: string; onSave: (v: string) => void }) {
  const [note, setNote] = useState(initialNote);
  const dirty = note !== initialNote;
  return (
    <View className="gap-1">
      <Text className="text-[10px] uppercase tracking-wider text-ink-3">Ghi chú</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        onBlur={() => { if (dirty) onSave(note); }}
        placeholder="Tên bác sĩ, tên phòng khám, lý do tái khám…"
        placeholderTextColor="#b5b5b5"
        multiline
        style={{
          borderWidth: 1, borderColor: "#c8c8c2", borderRadius: 8,
          padding: 10, fontSize: 13, color: "#1a1a1a",
          minHeight: 72, textAlignVertical: "top",
        }}
      />
      {dirty && (
        <Pressable onPress={() => onSave(note)} className="self-end">
          <Text className="text-xs text-accent-ink">Lưu ghi chú</Text>
        </Pressable>
      )}
    </View>
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
