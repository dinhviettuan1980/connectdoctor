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
import { addMetric, deleteMetric, subscribeToMetrics } from "@/lib/metrics";
import { getPatientProfile, savePatientProfile } from "@/lib/patientProfile";
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

  useEffect(() => {
    if (!user?.uid) return;
    getPatientProfile(user.uid)
      .then((p) => { if (p) { setProfile(p); setName(p.fullName ?? ""); } })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const save = (update: Partial<Omit<PatientProfile, "uid">>) => {
    if (!user?.uid) return;
    setProfile((prev) => ({ ...prev, ...update }));
    savePatientProfile(user.uid, update).catch(console.error);
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
const VISIBLE_TYPES = Object.keys(METRIC_DEFS) as MetricType[];

function fmtTs(ts: number) {
  return new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function MetricsTab({ onAdd }: { onAdd: () => void }) {
  const user = useAuthStore((s) => s.user);
  const [activeType, setActiveType] = useState<MetricType>("blood_pressure");
  const [allMetrics, setAllMetrics] = useState<MetricEntry[]>([]);
  const [chart, setChart] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [valA, setValA] = useState("");
  const [valB, setValB] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToMetrics(user.uid, setAllMetrics);
  }, [user?.uid]);

  const def = METRIC_DEFS[activeType]!;
  const entries = allMetrics
    .filter((e) => e.type === activeType)
    .sort((a, b) => b.measuredAt - a.measuredAt);

  const bpPoints = entries.slice(0, 9).reverse();
  const systolicArr  = bpPoints.map((e) => parseInt(e.value.split("/")[0]) || 0);
  const diastolicArr = bpPoints.map((e) => parseInt(e.value.split("/")[1] ?? "0") || 0);
  const bpAvg = bpPoints.length
    ? `TB ${Math.round(systolicArr.reduce((s, v) => s + v, 0) / bpPoints.length)}/${
        Math.round(diastolicArr.reduce((s, v) => s + v, 0) / bpPoints.length)}`
    : null;

  const openAdd = () => { setValA(""); setValB(""); setShowAdd(true); };

  const handleSave = async () => {
    if (!user?.uid) return;
    const a = valA.trim();
    const b = valB.trim();
    if (!a || (def.dual && !b)) return;
    setSaving(true);
    try {
      await addMetric(user.uid, activeType, def.label, def.dual ? `${a}/${b}` : a, def.unit || undefined);
      setShowAdd(false);
    } catch (err) {
      console.error("[addMetric]", err);
      Alert.alert("Lỗi", "Không thể lưu chỉ số.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry: MetricEntry) => {
    Alert.alert("Xoá chỉ số", `Xoá lần đo ${entry.value} ${def.unit}?`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => deleteMetric(entry.id).catch(console.error) },
    ]);
  };

  const showChart = chart && activeType === "blood_pressure" && bpPoints.length > 0;

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
            {activeType === "blood_pressure" && entries.length > 1 && (
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
            {entries.slice(0, 10).map((e) => (
              <Pressable
                key={e.id}
                onLongPress={() => handleDelete(e)}
                className="flex-row items-center py-2 border-b border-dashed border-line-soft"
              >
                <Text className="font-mono text-[11px] text-ink-3" style={{ width: 110 }}>{fmtTs(e.measuredAt)}</Text>
                <Text className="flex-1 font-mono font-bold text-ink">{e.value}</Text>
                <Text className="text-[10px] text-ink-3">{def.unit}</Text>
              </Pressable>
            ))}
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
            {def.dual ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">Tâm thu (mmHg)</Text>
                  <Input value={valA} onChangeText={setValA} placeholder="VD: 120" keyboardType="numeric" returnKeyType="next" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">Tâm trương (mmHg)</Text>
                  <Input value={valB} onChangeText={setValB} placeholder="VD: 80" keyboardType="numeric" returnKeyType="done" onSubmitEditing={handleSave} />
                </View>
              </View>
            ) : (
              <View>
                <Text className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">
                  Giá trị{def.unit ? ` (${def.unit})` : ""}
                </Text>
                <Input value={valA} onChangeText={setValA} placeholder="Nhập giá trị…" keyboardType="numeric" returnKeyType="done" onSubmitEditing={handleSave} />
              </View>
            )}
            <View className="flex-row gap-3">
              <Button variant="secondary" size="md" block onPress={() => setShowAdd(false)}>Huỷ</Button>
              <Button variant="primary" size="md" block loading={saving} onPress={handleSave}>Lưu</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}
