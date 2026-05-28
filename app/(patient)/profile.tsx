import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, FlatList,
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
import { Note } from "@/components/Note";
import { useAuthStore } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { healthService, type HeartRateSample } from "@/lib/health";
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
import { addMetric, updateMetric, deleteMetric, subscribeToMetrics } from "@/lib/metrics";
import { getPatientProfile, savePatientProfile } from "@/lib/patientProfile";
import {
  addSchedule, updateSchedule, deleteSchedule,
  subscribeToSchedules, type MedicationSchedule,
} from "@/lib/medicationSchedules";
import { requestNotificationPermission } from "@/lib/notifications";
import { scanForHealthDevices, type HealthDevice } from "@/lib/ble";
import type { MetricEntry, MetricType, PatientProfile } from "@/lib/types";

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// PickerField + PickerSheet (single-select bottom sheet)
// ---------------------------------------------------------------------------

function PickerField({
  label, value, placeholder, onPress,
}: { label: string; value: string; placeholder: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="border border-line rounded-lg px-3 py-2.5"
    >
      <Text className="text-[10px] text-ink-3 mb-0.5">{label}</Text>
      <View className="flex-row justify-between items-center">
        <Text className={value ? "text-sm text-ink" : "text-sm text-ink-4"}>
          {value || placeholder}
        </Text>
        <Text className="text-ink-4 text-xs ml-1">▾</Text>
      </View>
    </Pressable>
  );
}

function PickerSheet({
  visible, title, options, value, onSelect, onClose,
}: {
  visible: boolean; title: string; options: string[];
  value: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!visible) return;
    const idx = options.indexOf(value);
    if (idx >= 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.5 });
      }, 80);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
          onPress={onClose}
        />
        <View className="bg-paper rounded-t-2xl overflow-hidden" style={{ maxHeight: "70%" }}>
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-line-soft">
            <Text className="font-bold text-base text-ink">{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}><Text className="text-ink-3 text-base">✕</Text></Pressable>
          </View>
          <FlatList
            ref={listRef}
            data={options}
            keyExtractor={(item) => item}
            getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onSelect(item); onClose(); }}
                className="flex-row items-center justify-between px-5"
                style={{ height: 48, borderBottomWidth: 1, borderBottomColor: "#e8e8e0" }}
              >
                <Text className={item === value ? "text-sm font-bold text-accent-ink" : "text-sm text-ink"}>
                  {item}
                </Text>
                {item === value && <Text className="text-accent-ink">✓</Text>}
              </Pressable>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// MultiSelectSheet (multi-select bottom sheet for conditions / allergies)
// ---------------------------------------------------------------------------

function MultiSelectSheet({
  visible, title, options, selected, onDone, onClose,
}: {
  visible: boolean; title: string; options: string[];
  selected: string[]; onDone: (v: string[]) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [custom, setCustom] = useState("");

  useEffect(() => { if (visible) setDraft(selected); }, [visible]);

  const toggle = (item: string) =>
    setDraft((d) => d.includes(item) ? d.filter((x) => x !== item) : [...d, item]);

  const addCustom = () => {
    const val = custom.trim();
    if (!val || draft.includes(val)) return;
    setDraft((d) => [...d, val]);
    setCustom("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
          onPress={onClose}
        />
        <View className="bg-paper rounded-t-2xl overflow-hidden" style={{ maxHeight: "75%" }}>
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-line-soft">
            <Text className="font-bold text-base text-ink">{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}><Text className="text-ink-3 text-base">✕</Text></Pressable>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => item}
            getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
            renderItem={({ item }) => {
              const active = draft.includes(item);
              return (
                <Pressable
                  onPress={() => toggle(item)}
                  className="flex-row items-center justify-between px-5"
                  style={{ height: 48, borderBottomWidth: 1, borderBottomColor: "#e8e8e0" }}
                >
                  <Text className={active ? "text-sm font-bold text-accent-ink" : "text-sm text-ink"}>
                    {item}
                  </Text>
                  <View
                    className={[
                      "w-5 h-5 rounded border items-center justify-center",
                      active ? "bg-accent border-accent-ink" : "border-line-soft",
                    ].join(" ")}
                  >
                    {active && <Text className="text-[10px] font-bold text-paper">✓</Text>}
                  </View>
                </Pressable>
              );
            }}
            ListFooterComponent={
              <View className="flex-row gap-2 px-4 py-3 border-t border-line-soft">
                <View className="flex-1">
                  <Input
                    value={custom}
                    onChangeText={setCustom}
                    placeholder="Thêm khác…"
                    returnKeyType="done"
                    onSubmitEditing={addCustom}
                  />
                </View>
                <Button variant="secondary" size="sm" onPress={addCustom}>+</Button>
              </View>
            }
          />

          <View className="px-5 pb-6 pt-3 border-t border-line-soft">
            <Button variant="primary" block onPress={() => { onDone(draft); onClose(); }}>
              Xác nhận ({draft.length} đã chọn)
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Preset lists
// ---------------------------------------------------------------------------

const CONDITION_OPTIONS = [
  "Tăng huyết áp", "Tiểu đường type 1", "Tiểu đường type 2",
  "Bệnh tim mạch", "Suy tim", "Rối loạn nhịp tim",
  "Hen suyễn", "COPD", "Bệnh phổi mạn",
  "Bệnh thận mạn", "Sỏi thận",
  "Viêm khớp", "Loãng xương", "Gout",
  "Rối loạn tuyến giáp", "Cường giáp", "Nhược giáp",
  "Bệnh gan", "Viêm gan B", "Viêm gan C", "Xơ gan",
  "Ung thư", "Đột quỵ", "Động kinh",
  "Trầm cảm", "Rối loạn lo âu",
  "HIV/AIDS", "Lao phổi",
];

const ALLERGY_OPTIONS = [
  "Penicillin", "Amoxicillin", "Aspirin", "Ibuprofen",
  "Paracetamol", "Sulfamid", "Codein", "Morphin",
  "Thuốc cản quang (iốt)",
  "Tôm", "Cua", "Sò/Hàu", "Cá", "Hải sản",
  "Lạc (đậu phộng)", "Đậu nành", "Sữa bò", "Trứng",
  "Gluten (lúa mì)", "Mè (vừng)",
  "Phấn hoa", "Bụi nhà", "Lông thú",
  "Mủ cao su (latex)", "Nọc ong",
  "Niken", "Mỹ phẩm / hương liệu",
];

const TABS = [
  { key: "info", label: "Thông tin" },
  { key: "meds", label: "Đơn thuốc" },
  { key: "metrics", label: "Chỉ số" },
  { key: "reminders", label: "Nhắc nhở" },
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
          right={<UserMenu />}
        />
        <TopTabs tabs={TABS} active={tab} onChange={setTab} />
      </View>
      {tab === "info" && <InfoTab />}
      {tab === "meds" && <MedsTab />}
      {tab === "metrics" && <MetricsTab onAdd={() => router.push("/(patient)/ocr/upload?kind=metrics")} />}
      {tab === "reminders" && <RemindersTab />}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Info tab
// ---------------------------------------------------------------------------

const GENDER_DISPLAY: Record<string, string> = { male: "Nam", female: "Nữ", other: "Khác" };
const GENDER_VALUE: Record<string, "male" | "female" | "other"> = { Nam: "male", Nữ: "female", Khác: "other" };

function InfoTab() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Partial<PatientProfile>>({});
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<string | null>(null);
  const [multiPicker, setMultiPicker] = useState<"conditions" | "allergies" | null>(null);
  // Device scanning
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState<HealthDevice[]>([]);
  const [scanDone, setScanDone] = useState(false);
  const stopScanRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getPatientProfile(user.uid)
      .then((p) => { if (p) { setProfile(p); setName(p.fullName ?? ""); } })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  useEffect(() => () => { stopScanRef.current?.(); }, []);

  const save = (update: Partial<Omit<PatientProfile, "uid">>) => {
    if (!user?.uid) return;
    setProfile((prev) => ({ ...prev, ...update }));
    savePatientProfile(user.uid, update).catch(console.error);
  };

  const linkedIds: string[] = profile.linkedDeviceIds ?? [];

  const startScan = () => {
    setDiscovered([]); setScanDone(false); setScanning(true);
    stopScanRef.current = scanForHealthDevices((devices) => setDiscovered([...devices]), 8000);
    setTimeout(() => { setScanning(false); setScanDone(true); }, 8500);
  };

  const handleAddDevice = (dev: HealthDevice) => {
    if (!dev.firestoreId) return;
    const next = [...new Set([...linkedIds, dev.firestoreId])];
    save({ linkedDeviceIds: next });
  };

  const handleRemoveDevice = (deviceId: string) => {
    Alert.alert("Xoá thiết bị", "Huỷ liên kết thiết bị này?", [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => save({ linkedDeviceIds: linkedIds.filter((id) => id !== deviceId) }) },
    ]);
  };

  const currentYear = new Date().getFullYear();
  const heightOptions = Array.from({ length: 121 }, (_, i) => `${100 + i} cm`);
  const weightOptions = Array.from({ length: 121 }, (_, i) => `${30 + i} kg`);
  const birthYearOptions = Array.from({ length: currentYear - 1949 }, (_, i) => `${currentYear - 10 - i}`);
  const bloodTypeOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const genderOptions = ["Nam", "Nữ", "Khác"];

  const heightStr = profile.heightCm ? `${profile.heightCm} cm` : "";
  const weightStr = profile.weightKg ? `${profile.weightKg} kg` : "";
  const birthYearStr = profile.birthYear ? `${profile.birthYear}` : "";

  const bmi =
    profile.heightCm && profile.weightKg
      ? (profile.weightKg / (profile.heightCm / 100) ** 2).toFixed(1)
      : null;
  const bmiLabel = bmi
    ? parseFloat(bmi) < 18.5
      ? "Thiếu cân"
      : parseFloat(bmi) < 25
      ? "Bình thường"
      : parseFloat(bmi) < 30
      ? "Thừa cân"
      : "Béo phì"
    : null;
  const age = profile.birthYear ? currentYear - profile.birthYear : null;
  const genderDisplay = profile.gender ? GENDER_DISPLAY[profile.gender] : "";

  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* Summary card */}
      <Card variant="accent" padding="md">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="font-bold text-ink">{name || "Chưa có tên"}</Text>
            <Text className="text-[11px] text-ink-3">
              {[genderDisplay, age ? `${age} tuổi` : null, profile.bloodType]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          {bmi && (
            <View className="items-end">
              <Text className="font-mono font-bold text-base text-ink">{bmi}</Text>
              <Text className="text-[10px] text-ink-3">BMI · {bmiLabel}</Text>
            </View>
          )}
        </View>
      </Card>

      {/* Name */}
      <Input
        label="Họ và tên"
        value={name}
        onChangeText={setName}
        onBlur={() => save({ fullName: name })}
        placeholder="Nguyễn Văn A"
        returnKeyType="done"
      />

      {/* Height & Weight */}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <PickerField label="Chiều cao" value={heightStr} placeholder="Chọn…" onPress={() => setPicker("height")} />
        </View>
        <View className="flex-1">
          <PickerField label="Cân nặng" value={weightStr} placeholder="Chọn…" onPress={() => setPicker("weight")} />
        </View>
      </View>

      {/* Birth year & Blood type */}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <PickerField label="Năm sinh" value={birthYearStr} placeholder="Chọn…" onPress={() => setPicker("birthYear")} />
        </View>
        <View className="flex-1">
          <PickerField label="Nhóm máu" value={profile.bloodType ?? ""} placeholder="Chọn…" onPress={() => setPicker("bloodType")} />
        </View>
      </View>

      {/* Gender */}
      <PickerField label="Giới tính" value={genderDisplay} placeholder="Chọn…" onPress={() => setPicker("gender")} />

      {/* Conditions */}
      <Section
        title="Bệnh nền"
        action={
          <Pressable onPress={() => setMultiPicker("conditions")} hitSlop={8}>
            <Text className="text-[11px] text-accent-ink">Chỉnh sửa</Text>
          </Pressable>
        }
      >
        {(profile.conditions?.length ?? 0) > 0 ? (
          <View className="flex-row flex-wrap gap-1.5">
            {profile.conditions!.map((c) => <Chip key={c}>{c}</Chip>)}
          </View>
        ) : (
          <Text className="text-[11px] text-ink-3">Chưa có. Nhấn Chỉnh sửa để thêm.</Text>
        )}
      </Section>

      {/* Allergies */}
      <Section
        title="Dị ứng"
        action={
          <Pressable onPress={() => setMultiPicker("allergies")} hitSlop={8}>
            <Text className="text-[11px] text-accent-ink">Chỉnh sửa</Text>
          </Pressable>
        }
      >
        {(profile.allergies?.length ?? 0) > 0 ? (
          <View className="flex-row flex-wrap gap-1.5">
            {profile.allergies!.map((a) => <Chip key={a}>{a}</Chip>)}
          </View>
        ) : (
          <Text className="text-[11px] text-ink-3">Chưa có. Nhấn Chỉnh sửa để thêm.</Text>
        )}
      </Section>

      {/* Devices */}
      <Section
        title="THIẾT BỊ SỨC KHOẺ"
        action={
          <Button variant="secondary" size="sm" loading={scanning} disabled={scanning} onPress={startScan}>
            {scanning ? "Đang quét…" : "🔍 Quét"}
          </Button>
        }
      >
        {linkedIds.length === 0 && !scanning && !scanDone && (
          <Text className="text-[11px] text-ink-3">Chưa có thiết bị. Nhấn Quét để tìm.</Text>
        )}
        {linkedIds.map((id) => (
          <View key={id} className="flex-row items-center justify-between py-1.5 border-b border-dashed border-line-soft">
            <View className="flex-row items-center gap-2">
              <Text>⌚</Text>
              <View>
                <Text className="text-xs font-bold text-ink">Garmin Watch</Text>
                <Text className="font-mono text-[10px] text-ink-3">{id}</Text>
              </View>
            </View>
            <Pressable onPress={() => handleRemoveDevice(id)} hitSlop={8}>
              <Text className="text-xs text-danger">Xoá</Text>
            </Pressable>
          </View>
        ))}
        {scanning && (
          <View className="flex-row items-center gap-2 py-2">
            <ActivityIndicator size="small" color="#5eb594" />
            <Text className="text-[11px] text-ink-3">Đang tìm thiết bị Garmin qua Bluetooth…</Text>
          </View>
        )}
        {discovered.filter((d) => !linkedIds.includes(d.firestoreId ?? "")).map((dev) => (
          <View key={dev.bleId} className="flex-row items-center justify-between py-1.5 border-b border-dashed border-line-soft">
            <View className="flex-row items-center gap-2 flex-1 mr-2">
              <Text>⌚</Text>
              <View className="flex-1">
                <Text className="text-xs font-bold text-ink">{dev.name}</Text>
                <Text className="font-mono text-[10px] text-ink-3">
                  {dev.firestoreId ? `ID: ${dev.firestoreId}` : "Chưa có dữ liệu đồng bộ"}
                </Text>
              </View>
            </View>
            {dev.firestoreId ? (
              <Button variant="primary" size="sm" onPress={() => handleAddDevice(dev)}>Thêm</Button>
            ) : (
              <Text className="text-[10px] text-ink-4">—</Text>
            )}
          </View>
        ))}
        {scanDone && discovered.length === 0 && (
          <Text className="text-[11px] text-ink-3 mt-1">Không tìm thấy thiết bị Garmin nào.</Text>
        )}
      </Section>

      {/* Single-select pickers */}
      <PickerSheet
        visible={picker === "height"} title="Chiều cao" options={heightOptions} value={heightStr}
        onSelect={(v) => save({ heightCm: parseInt(v) })} onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === "weight"} title="Cân nặng" options={weightOptions} value={weightStr}
        onSelect={(v) => save({ weightKg: parseInt(v) })} onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === "birthYear"} title="Năm sinh" options={birthYearOptions} value={birthYearStr}
        onSelect={(v) => save({ birthYear: parseInt(v) })} onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === "bloodType"} title="Nhóm máu" options={bloodTypeOptions} value={profile.bloodType ?? ""}
        onSelect={(v) => save({ bloodType: v })} onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === "gender"} title="Giới tính" options={genderOptions} value={genderDisplay}
        onSelect={(v) => save({ gender: GENDER_VALUE[v] })} onClose={() => setPicker(null)}
      />

      {/* Multi-select sheets */}
      <MultiSelectSheet
        visible={multiPicker === "conditions"} title="Bệnh nền" options={CONDITION_OPTIONS}
        selected={profile.conditions ?? []} onDone={(v) => save({ conditions: v })} onClose={() => setMultiPicker(null)}
      />
      <MultiSelectSheet
        visible={multiPicker === "allergies"} title="Dị ứng" options={ALLERGY_OPTIONS}
        selected={profile.allergies ?? []} onDone={(v) => save({ allergies: v })} onClose={() => setMultiPicker(null)}
      />
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
          try {
            setSelectedId(null);
            await deletePrescription(p);
          } catch (err) {
            console.error("[deletePrescription]", err);
            Alert.alert("Lỗi", "Không thể xoá đơn thuốc. Kiểm tra kết nối và thử lại.");
          }
        },
      },
    ]);
  };

  // ── Add image inside detail modal ────────────────────────────────────────
  const handleAddImage = async (fromCamera: boolean) => {
    if (!user?.uid || !selectedId) return;
    let result: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Cần quyền", "Cấp quyền camera."); return; }
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    } else {
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Cần quyền", "Cấp quyền thư viện ảnh."); return; }
      }
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
                <View className="flex-1">
                  <Button block onPress={() => handleAddImage(false)} disabled={uploading}>
                    📁 Chọn file
                  </Button>
                </View>
                <View className="flex-1">
                  <Button variant="primary" block onPress={() => handleAddImage(true)} disabled={uploading}>
                    📷 Chụp ảnh
                  </Button>
                </View>
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

function HealthSyncCard() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [samples, setSamples] = useState<HeartRateSample[]>([]);

  useEffect(() => {
    healthService.isAvailable().then(setAvailable);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await healthService.requestPermissions(["heartRate"]);
      const end = Date.now();
      const start = end - 24 * 60 * 60 * 1000; // last 24 h
      const data = await healthService.getHeartRateSamples(start, end);
      setSamples(data.slice(-8)); // show last 8 readings
    } finally {
      setSyncing(false);
    }
  };

  // Not yet on a native build — show informational card
  if (available === false) {
    return (
      <Card variant="soft" padding="md">
        <Text className="font-bold text-ink text-xs mb-1">Đồng bộ từ đồng hồ thông minh</Text>
        <Text className="text-[11px] text-ink-3 mb-3">
          Hỗ trợ Garmin, Apple Watch, Samsung Watch qua HealthKit (iOS) và Health Connect (Android).
          Cần build EAS để kích hoạt.
        </Text>
        {samples.length === 0 ? (
          <Button variant="secondary" size="sm" loading={syncing} onPress={handleSync}>
            Xem dữ liệu mẫu
          </Button>
        ) : (
          <View className="gap-1">
            {samples.map((s) => (
              <View key={s.timestamp} className="flex-row items-center gap-2">
                <Text className="font-mono text-[11px] text-ink-3" style={{ width: 110 }}>
                  {new Date(s.timestamp).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                </Text>
                <Text className="font-mono font-bold text-ink text-sm">{s.value}</Text>
                <Text className="text-[10px] text-ink-3">bpm · {s.source}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  }

  // Available (native build with HealthKit / Health Connect)
  return (
    <Card variant="accent" padding="md">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-bold text-accent-ink text-xs">Đồng bộ từ đồng hồ</Text>
        <Button variant="primary" size="sm" loading={syncing} onPress={handleSync}>
          Đồng bộ
        </Button>
      </View>
      {samples.length === 0 ? (
        <Text className="text-[11px] text-ink-3">Chưa có dữ liệu. Nhấn Đồng bộ để tải.</Text>
      ) : (
        <View className="gap-1">
          {samples.map((s) => (
            <View key={s.timestamp} className="flex-row items-center gap-2">
              <Text className="font-mono text-[11px] text-ink-3" style={{ width: 110 }}>
                {new Date(s.timestamp).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
              </Text>
              <Text className="font-mono font-bold text-ink text-sm">{s.value}</Text>
              <Text className="text-[10px] text-ink-3">bpm · {s.source}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

type MetricDef = { label: string; unit: string; dual?: boolean };

const METRIC_DEFS: Partial<Record<MetricType, MetricDef>> = {
  blood_pressure: { label: "Huyết áp",    unit: "mmHg",    dual: true },
  heart_rate:     { label: "Nhịp tim",    unit: "bpm" },
  blood_glucose:  { label: "Đường máu",   unit: "mmol/L" },
  cholesterol:    { label: "Cholesterol", unit: "mmol/L" },
};
// heart_rate is entered together with blood_pressure — not shown as its own tab
const VISIBLE_TYPES: MetricType[] = ["blood_pressure", "blood_glucose", "cholesterol"];

function fmtTs(ts: number) {
  return new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function MetricsTab({ onAdd }: { onAdd: () => void }) {
  const user = useAuthStore((s) => s.user);
  const [activeType, setActiveType] = useState<MetricType>("blood_pressure");
  const [allMetrics, setAllMetrics] = useState<MetricEntry[]>([]);
  const [chart, setChart] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [valA, setValA] = useState("");
  const [valB, setValB] = useState("");
  const [valHR, setValHR] = useState("");
  const [saving, setSaving] = useState(false);
  // Edit state (BP+HR only)
  const [editEntry, setEditEntry] = useState<MetricEntry | null>(null);
  const [editHrEntry, setEditHrEntry] = useState<MetricEntry | null>(null);
  const [editValA, setEditValA] = useState("");
  const [editValB, setEditValB] = useState("");
  const [editValHR, setEditValHR] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToMetrics(user.uid, setAllMetrics);
  }, [user?.uid]);

  const def = METRIC_DEFS[activeType]!;
  const entries = allMetrics
    .filter((e) => e.type === activeType)
    .sort((a, b) => b.measuredAt - a.measuredAt);
  const hrEntries = allMetrics.filter((e) => e.type === "heart_rate");

  const bpPoints = entries.slice(0, 9).reverse();
  const systolicArr  = bpPoints.map((e) => parseInt(e.value.split("/")[0]) || 0);
  const diastolicArr = bpPoints.map((e) => parseInt(e.value.split("/")[1] ?? "0") || 0);
  const bpAvg = bpPoints.length
    ? `TB ${Math.round(systolicArr.reduce((s, v) => s + v, 0) / bpPoints.length)}/${
        Math.round(diastolicArr.reduce((s, v) => s + v, 0) / bpPoints.length)}`
    : null;

  const findLinkedHR = (e: MetricEntry) =>
    hrEntries.find((h) => Math.abs(h.measuredAt - e.measuredAt) < 60_000) ?? null;

  const openAdd = () => { setValA(""); setValB(""); setValHR(""); setShowAdd(true); };

  const openEdit = (e: MetricEntry) => {
    const parts = e.value.split("/");
    const hr = findLinkedHR(e);
    setEditValA(parts[0] ?? "");
    setEditValB(parts[1] ?? "");
    setEditValHR(hr?.value ?? "");
    setEditEntry(e);
    setEditHrEntry(hr);
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    const a = valA.trim();
    const b = valB.trim();
    if (!a || (activeType === "blood_pressure" && !b)) return;
    setSaving(true);
    try {
      const now = Date.now();
      if (activeType === "blood_pressure") {
        await addMetric(user.uid, "blood_pressure", "Huyết áp", `${a}/${b}`, "mmHg", now);
        const hr = valHR.trim();
        if (hr) await addMetric(user.uid, "heart_rate", "Nhịp tim", hr, "bpm", now);
      } else {
        await addMetric(user.uid, activeType, def.label, a, def.unit || undefined);
      }
      setShowAdd(false);
    } catch (err) {
      console.error("[addMetric]", err);
      Alert.alert("Lỗi", "Không thể lưu chỉ số.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!user?.uid || !editEntry) return;
    const a = editValA.trim();
    const b = editValB.trim();
    if (!a || !b) return;
    setEditSaving(true);
    try {
      await updateMetric(editEntry.id, `${a}/${b}`);
      const hr = editValHR.trim();
      if (hr) {
        if (editHrEntry) {
          await updateMetric(editHrEntry.id, hr);
        } else {
          await addMetric(user.uid, "heart_rate", "Nhịp tim", hr, "bpm", editEntry.measuredAt);
        }
      }
      setEditEntry(null);
    } catch (err) {
      console.error("[updateMetric]", err);
      Alert.alert("Lỗi", "Không thể cập nhật chỉ số.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = (entry: MetricEntry) => {
    Alert.alert("Xoá chỉ số", `Xoá lần đo ${entry.value} ${def.unit}?`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => deleteMetric(entry.id).catch(console.error) },
    ]);
  };

  const showChart = chart && activeType === "blood_pressure" && bpPoints.length > 0;
  const isBP = activeType === "blood_pressure";

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View className="flex-row gap-2 flex-wrap">
        {VISIBLE_TYPES.map((t) => (
          <Chip key={t} variant={activeType === t ? "accent" : "default"} onPress={() => setActiveType(t)}>
            {METRIC_DEFS[t]!.label}
          </Chip>
        ))}
      </View>

      <Card padding="md">
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <Text className="font-bold text-ink">{def.label}</Text>
            <Text className="text-[11px] text-ink-3">
              {entries.length > 0 ? `${entries.length} lần đo · ${def.unit}` : def.unit}
            </Text>
          </View>
          <View className="flex-row gap-2 items-center">
            {isBP && entries.length > 1 && (
              <Segmented
                value={chart ? "chart" : "list"}
                onChange={(v) => setChart(v === "chart")}
                options={[{ value: "list", label: "List" }, { value: "chart", label: "Chart" }]}
              />
            )}
            <Button variant="secondary" size="sm" onPress={openAdd}>+ Thêm</Button>
          </View>
        </View>

        {entries.length === 0 ? (
          <Text className="text-center text-sm text-ink-3 py-6">
            Chưa có dữ liệu.{"\n"}Nhấn "+ Thêm" để ghi lần đo đầu tiên.
          </Text>
        ) : showChart ? (
          <>
            <MetricChart systolic={systolicArr} diastolic={diastolicArr} />
            <View className="flex-row justify-between mt-1">
              <Text className="text-[10px] text-ink-3">Tâm thu (xanh) · Tâm trương (đứt)</Text>
              {bpAvg && <Text className="text-[10px] text-ink-3">{bpAvg}</Text>}
            </View>
          </>
        ) : (
          <View>
            {entries.slice(0, 10).map((e) => {
              const hr = isBP ? findLinkedHR(e) : null;
              return (
                <Pressable
                  key={e.id}
                  onPress={isBP ? () => openEdit(e) : undefined}
                  onLongPress={isBP ? undefined : () => handleDelete(e)}
                  className="flex-row items-center py-2 border-b border-dashed border-line-soft"
                >
                  <Text className="font-mono text-[11px] text-ink-3" style={{ width: 100 }}>{fmtTs(e.measuredAt)}</Text>
                  <View className="flex-1">
                    <Text className="font-mono font-bold text-ink">{e.value} <Text className="font-mono text-[10px] text-ink-3">{def.unit}</Text></Text>
                    {hr && <Text className="font-mono text-[11px] text-ink-3">{hr.value} bpm</Text>}
                  </View>
                  {isBP
                    ? <Text className="text-[10px] text-accent-ink">Sửa ›</Text>
                    : <Text className="text-[10px] text-ink-4">giữ xoá</Text>}
                </Pressable>
              );
            })}
            {entries.length > 10 && (
              <Text className="text-[10px] text-ink-3 text-center mt-2">+{entries.length - 10} lần đo nữa</Text>
            )}
          </View>
        )}
      </Card>

      <HealthSyncCard />

      <Button variant="primary" block leftIcon={<Text>📷</Text>} onPress={onAdd}>
        OCR phiếu xét nghiệm
      </Button>

      {/* Add metric modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
            onPress={() => setShowAdd(false)}
          />
          <View className="bg-paper rounded-t-2xl px-5 pt-5 pb-8 gap-4">
            <Text className="font-bold text-base text-ink">Thêm đo {def.label}</Text>
            {isBP ? (
              <>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">Tâm thu (mmHg)</Text>
                    <Input value={valA} onChangeText={setValA} placeholder="VD: 120" keyboardType="numeric" returnKeyType="next" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">Tâm trương (mmHg)</Text>
                    <Input value={valB} onChangeText={setValB} placeholder="VD: 80" keyboardType="numeric" returnKeyType="next" />
                  </View>
                </View>
                <View>
                  <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">Nhịp tim (bpm)</Text>
                  <Input value={valHR} onChangeText={setValHR} placeholder="VD: 72" keyboardType="numeric" returnKeyType="done" onSubmitEditing={handleSave} />
                </View>
              </>
            ) : (
              <View>
                <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">
                  Giá trị{def.unit ? ` (${def.unit})` : ""}
                </Text>
                <Input value={valA} onChangeText={setValA} placeholder="Nhập giá trị…" keyboardType="numeric" returnKeyType="done" onSubmitEditing={handleSave} />
              </View>
            )}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button variant="secondary" block onPress={() => setShowAdd(false)}>Huỷ</Button>
              </View>
              <View className="flex-1">
                <Button variant="primary" block loading={saving} onPress={handleSave}>Lưu</Button>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit BP+HR modal */}
      <Modal visible={!!editEntry} animationType="slide" transparent onRequestClose={() => setEditEntry(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
            onPress={() => setEditEntry(null)}
          />
          <View className="bg-paper rounded-t-2xl px-5 pt-5 pb-8 gap-4">
            <Text className="font-bold text-base text-ink">Sửa lần đo</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">Tâm thu (mmHg)</Text>
                <Input value={editValA} onChangeText={setEditValA} placeholder="120" keyboardType="numeric" returnKeyType="next" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">Tâm trương (mmHg)</Text>
                <Input value={editValB} onChangeText={setEditValB} placeholder="80" keyboardType="numeric" returnKeyType="next" />
              </View>
            </View>
            <View>
              <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">Nhịp tim (bpm)</Text>
              <Input value={editValHR} onChangeText={setEditValHR} placeholder="72" keyboardType="numeric" returnKeyType="done" onSubmitEditing={handleEditSave} />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button variant="secondary" block onPress={() => setEditEntry(null)}>Huỷ</Button>
              </View>
              <View className="flex-1">
                <Button variant="primary" block loading={editSaving} onPress={handleEditSave}>Lưu</Button>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Reminders tab — medication schedule CRUD + local notifications
// ---------------------------------------------------------------------------

function pad2(n: number) { return String(n).padStart(2, "0"); }

function reminderTime(hour: number, minute: number) {
  const rMin = minute < 5 ? minute + 55 : minute - 5;
  const rHour = minute < 5 ? (hour - 1 + 24) % 24 : hour;
  return `${pad2(rHour)}:${pad2(rMin)}`;
}

function RemindersTab() {
  const user = useAuthStore((s) => s.user);
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [permGranted, setPermGranted] = useState<boolean | null>(null);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftHour, setDraftHour] = useState(8);
  const [draftMinute, setDraftMinute] = useState(0);
  const [draftPrescriptionId, setDraftPrescriptionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    requestNotificationPermission().then(setPermGranted);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubSchedules = subscribeToSchedules(user.uid, setSchedules);
    const unsubRx = subscribeToPrescriptions(user.uid, setPrescriptions);
    return () => { unsubSchedules(); unsubRx(); };
  }, [user?.uid]);

  const openAdd = () => {
    setDraftLabel(""); setDraftHour(8); setDraftMinute(0);
    setDraftPrescriptionId(prescriptions[0]?.id ?? null);
    setEditId(null); setAdding(true);
  };

  const openEdit = (s: MedicationSchedule) => {
    setDraftLabel(s.label); setDraftHour(s.hour); setDraftMinute(s.minute);
    setDraftPrescriptionId(s.prescriptionId ?? null);
    setEditId(s.id); setAdding(true);
  };

  const handleSave = async () => {
    if (!user?.uid || !draftLabel.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await updateSchedule(user.uid, editId, {
          label: draftLabel.trim(), hour: draftHour, minute: draftMinute,
          enabled: true, prescriptionId: draftPrescriptionId,
        });
      } else {
        await addSchedule(user.uid, draftLabel.trim(), draftHour, draftMinute, draftPrescriptionId);
      }
      setAdding(false);
    } catch (err) {
      console.error("[saveSchedule]", err);
      Alert.alert("Lỗi", "Không thể lưu lịch nhắc. Kiểm tra kết nối và thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (s: MedicationSchedule) => {
    if (!user?.uid) return;
    updateSchedule(user.uid, s.id, { enabled: !s.enabled }).catch(console.error);
  };

  const handleDelete = (s: MedicationSchedule) => {
    if (!user?.uid) return;
    Alert.alert("Xoá lịch nhắc", `Xoá "${s.label}"?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá", style: "destructive",
        onPress: async () => {
          try {
            await deleteSchedule(user.uid!, s.id);
          } catch (err) {
            console.error("[deleteSchedule]", err);
            Alert.alert("Lỗi", "Không thể xoá lịch nhắc. Kiểm tra kết nối và thử lại.");
          }
        },
      },
    ]);
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const rxLabel = (id: string | null | undefined) => {
    if (!id) return null;
    const rx = prescriptions.find((p) => p.id === id);
    return rx ? `Đơn ${new Date(rx.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}` : null;
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {permGranted === false && (
        <Note>Thông báo bị tắt. Vào Cài đặt → ConnectDoctor → Thông báo để bật.</Note>
      )}

      <Button variant="primary" block onPress={openAdd}>+ Thêm giờ uống thuốc</Button>

      {schedules.length === 0 && !adding && (
        <View className="items-center py-12 gap-1">
          <Text className="text-sm text-ink-3">Chưa có lịch nhắc nào</Text>
          <Text className="text-[11px] text-ink-4">Nhấn "+ Thêm" để tạo lịch nhắc uống thuốc</Text>
        </View>
      )}

      {schedules.map((s) => (
        <Card key={s.id} padding="md">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 gap-0.5 mr-3">
              <Text className="text-xs font-bold text-ink">{s.label}</Text>
              <Text className="font-mono text-sm font-bold text-accent-ink">
                {pad2(s.hour)}:{pad2(s.minute)}
                {"  "}
                <Text className="text-[10px] text-ink-3 font-normal">
                  nhắc lúc {reminderTime(s.hour, s.minute)}
                </Text>
              </Text>
              {rxLabel(s.prescriptionId) && (
                <Text className="text-[10px] text-ink-3">{rxLabel(s.prescriptionId)}</Text>
              )}
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => handleToggle(s)}
                className={[
                  "px-2.5 py-1 rounded-full border flex-row items-center gap-1",
                  s.enabled ? "bg-accent-soft border-accent-ink" : "bg-paper-2 border-line-soft",
                ].join(" ")}
              >
                <View className={[
                  "w-2 h-2 rounded-full",
                  s.enabled ? "bg-accent-ink" : "bg-ink-4",
                ].join(" ")} />
                <Text className={["text-[10px] font-bold", s.enabled ? "text-accent-ink" : "text-ink-3"].join(" ")}>
                  {s.enabled ? "Đang bật" : "Đã tắt"}
                </Text>
              </Pressable>
              <Pressable onPress={() => openEdit(s)} hitSlop={8}>
                <Text className="text-xs text-accent-ink">Sửa</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(s)} hitSlop={8}>
                <Text className="text-xs text-danger">Xoá</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      ))}

      {/* Add / Edit bottom sheet */}
      <Modal
        visible={adding}
        transparent
        animationType={Platform.OS === "web" ? "none" : "slide"}
        onRequestClose={() => setAdding(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
            onPress={() => setAdding(false)}
          />
          <View className="bg-paper rounded-t-2xl overflow-hidden" style={{ maxHeight: "85%" }}>
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-line-soft">
              <Text className="font-bold text-base text-ink">
                {editId ? "Sửa lịch nhắc" : "Thêm lịch nhắc"}
              </Text>
              <Pressable onPress={() => setAdding(false)} hitSlop={12}>
                <Text className="text-ink-3 text-base">✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              <Input
                label="Tên gợi nhớ"
                value={draftLabel}
                onChangeText={setDraftLabel}
                placeholder="Vd: Uống thuốc sáng, Uống thuốc tối…"
                returnKeyType="done"
              />

              <View className="gap-1.5">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3">Giờ</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2 pb-1">
                    {hourOptions.map((h) => (
                      <Pressable
                        key={h}
                        onPress={() => setDraftHour(h)}
                        className={[
                          "w-11 h-11 rounded-lg items-center justify-center border",
                          draftHour === h ? "bg-accent border-accent-ink" : "bg-paper-2 border-line-soft",
                        ].join(" ")}
                      >
                        <Text className={["font-mono text-sm font-bold", draftHour === h ? "text-paper" : "text-ink"].join(" ")}>
                          {pad2(h)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View className="gap-1.5">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3">Phút</Text>
                <View className="flex-row flex-wrap gap-2">
                  {minuteOptions.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setDraftMinute(m)}
                      className={[
                        "w-14 h-10 rounded-lg items-center justify-center border",
                        draftMinute === m ? "bg-accent border-accent-ink" : "bg-paper-2 border-line-soft",
                      ].join(" ")}
                    >
                      <Text className={["font-mono text-sm font-bold", draftMinute === m ? "text-paper" : "text-ink"].join(" ")}>
                        :{pad2(m)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {prescriptions.length > 0 && (
                <View className="gap-1.5">
                  <Text className="text-[10px] uppercase tracking-wider text-ink-3">Đơn thuốc liên kết</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2 pb-1">
                      <Pressable
                        onPress={() => setDraftPrescriptionId(null)}
                        className={[
                          "px-3 py-2 rounded-lg border",
                          !draftPrescriptionId ? "bg-accent border-accent-ink" : "bg-paper-2 border-line-soft",
                        ].join(" ")}
                      >
                        <Text className={["text-xs font-bold", !draftPrescriptionId ? "text-paper" : "text-ink-3"].join(" ")}>
                          Không chọn
                        </Text>
                      </Pressable>
                      {prescriptions.map((p) => (
                        <Pressable
                          key={p.id}
                          onPress={() => setDraftPrescriptionId(p.id)}
                          className={[
                            "px-3 py-2 rounded-lg border",
                            draftPrescriptionId === p.id ? "bg-accent border-accent-ink" : "bg-paper-2 border-line-soft",
                          ].join(" ")}
                        >
                          <Text className={["text-xs font-bold", draftPrescriptionId === p.id ? "text-paper" : "text-ink"].join(" ")}>
                            {new Date(p.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </Text>
                          {p.note ? (
                            <Text className={["text-[10px]", draftPrescriptionId === p.id ? "text-paper" : "text-ink-3"].join(" ")} numberOfLines={1}>
                              {p.note}
                            </Text>
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <Card variant="accent" padding="sm">
                <Text className="text-[11px] text-accent-ink text-center">
                  Thông báo sẽ xuất hiện lúc{" "}
                  <Text className="font-bold">{reminderTime(draftHour, draftMinute)}</Text>
                  {" "}— 5 phút trước {pad2(draftHour)}:{pad2(draftMinute)}
                </Text>
              </Card>

              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button variant="secondary" block onPress={() => setAdding(false)}>Huỷ</Button>
                </View>
                <View className="flex-1">
                  <Button variant="primary" block loading={saving} disabled={!draftLabel.trim()} onPress={handleSave}>
                    {editId ? "Lưu" : "Thêm"}
                  </Button>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Devices tab — BLE scan for Garmin watches + link to Firestore my_data
// ---------------------------------------------------------------------------

function rssiBar(rssi: number): string {
  if (rssi > -60) return "████";
  if (rssi > -75) return "███░";
  if (rssi > -85) return "██░░";
  return "█░░░";
}

