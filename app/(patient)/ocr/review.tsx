import { useEffect, useState } from "react";
import { View, Text, ScrollView, Image, ActivityIndicator, TextInput, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { extractMedsFromImage, extractMetricsFromImage } from "@/lib/ocr";
import { useAuthStore } from "@/hooks/useAuth";
import { createPrescription, addImageToPrescription, updatePrescriptionNote } from "@/lib/prescriptions";
import { addMetric } from "@/lib/metrics";
import type { Medication, MetricEntry, MetricType } from "@/lib/types";

const inputCls = "border border-line-soft rounded-lg px-2.5 py-1.5 text-xs text-ink bg-paper";

export default function OcrReview() {
  const router = useRouter();
  const { uri, kind } = useLocalSearchParams<{ uri: string; kind: string }>();
  const user = useAuthStore((s) => s.user);
  const isMeds = kind !== "metrics";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meds, setMeds] = useState<Partial<Medication>[]>([]);
  const [metrics, setMetrics] = useState<Partial<MetricEntry>[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isMeds) setMeds(await extractMedsFromImage(uri));
      else setMetrics(await extractMetricsFromImage(uri));
      setLoading(false);
    })();
  }, [uri, kind]);

  // ── editors ──
  const updMed = (i: number, k: keyof Medication, v: string) =>
    setMeds((p) => p.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)));
  const delMed = (i: number) => setMeds((p) => p.filter((_, idx) => idx !== i));
  const addMed = () => setMeds((p) => [...p, { name: "", dose: "", category: "" }]);

  const updMet = (i: number, k: keyof MetricEntry, v: string) =>
    setMetrics((p) => p.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)));
  const delMet = (i: number) => setMetrics((p) => p.filter((_, idx) => idx !== i));
  const addMet = () =>
    setMetrics((p) => [...p, { type: "custom", label: "", value: "", unit: "", measuredAt: Date.now() }]);

  const count = isMeds ? meds.length : metrics.length;

  // ── save ──
  const save = async () => {
    if (!user?.uid) { Alert.alert("Lỗi", "Bạn cần đăng nhập."); return; }
    setSaving(true);
    try {
      if (isMeds) {
        const valid = meds.filter((m) => (m.name || "").trim());
        if (valid.length === 0) { Alert.alert("Trống", "Chưa có thuốc nào để lưu."); setSaving(false); return; }
        const id = await createPrescription(user.uid);
        try { await addImageToPrescription(id, user.uid, uri); } catch { /* ảnh lỗi không chặn lưu */ }
        const note = valid
          .map((m) => `• ${m.name}${m.dose ? ` — ${m.dose}` : ""}${m.category ? ` (${m.category})` : ""}`)
          .join("\n");
        await updatePrescriptionNote(id, note);
        router.replace({ pathname: "/(patient)/ocr/confirm", params: { kind, count: String(valid.length) } });
      } else {
        const valid = metrics.filter((m) => (m.label || "").trim());
        if (valid.length === 0) { Alert.alert("Trống", "Chưa có chỉ số nào để lưu."); setSaving(false); return; }
        for (const m of valid) {
          await addMetric(user.uid, (m.type as MetricType) || "custom", m.label!.trim(),
            String(m.value ?? "").trim(), (m.unit || "").trim() || undefined, m.measuredAt);
        }
        router.replace({ pathname: "/(patient)/ocr/confirm", params: { kind, count: String(valid.length) } });
      }
    } catch (e) {
      Alert.alert("Lỗi", "Không lưu được: " + (e as Error).message);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <AppBar title={isMeds ? "Kiểm tra đơn thuốc" : "Kết quả phiếu XN"} subtitle="Bước 2/3 · Sửa & lưu" back />

        <View className="flex-row gap-3">
          <Image
            source={{ uri }}
            style={{ width: 80, height: 100, borderRadius: 8, borderWidth: 1, borderColor: "#c8c8c2" }}
            resizeMode="cover"
          />
          <View className="flex-1 gap-1 justify-center">
            {loading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" />
                <Text className="text-xs text-ink-3">AI đang đọc ảnh…</Text>
              </View>
            ) : (
              <>
                <Chip variant="accent">✓ {count} mục đọc được</Chip>
                <Text className="text-[11px] text-ink-3 mt-1">Sửa lại nếu sai rồi bấm Lưu.</Text>
              </>
            )}
          </View>
        </View>

        {!loading && isMeds && (
          <View className="gap-2">
            {meds.map((m, i) => (
              <Card key={i} padding="md">
                <View className="gap-1.5">
                  <View className="flex-row items-center gap-2">
                    <TextInput className={`${inputCls} flex-1 font-bold`} placeholder="Tên thuốc + hàm lượng"
                      value={m.name ?? ""} onChangeText={(v) => updMed(i, "name", v)} />
                    <Pressable onPress={() => delMed(i)} hitSlop={8}><Text className="text-danger text-lg">✕</Text></Pressable>
                  </View>
                  <TextInput className={inputCls} placeholder="Cách dùng / liều"
                    value={m.dose ?? ""} onChangeText={(v) => updMed(i, "dose", v)} />
                  <TextInput className={inputCls} placeholder="Nhóm (Huyết áp, Xương khớp…)"
                    value={m.category ?? ""} onChangeText={(v) => updMed(i, "category", v)} />
                </View>
              </Card>
            ))}
            <Button size="sm" onPress={addMed}>＋ Thêm thuốc</Button>
          </View>
        )}

        {!loading && !isMeds && (
          <View className="gap-2">
            {metrics.map((m, i) => (
              <Card key={i} padding="md">
                <View className="flex-row items-center gap-2">
                  <TextInput className={`${inputCls} flex-[2]`} placeholder="Chỉ số"
                    value={m.label ?? ""} onChangeText={(v) => updMet(i, "label", v)} />
                  <TextInput className={`${inputCls} flex-1 text-right`} placeholder="Giá trị"
                    value={String(m.value ?? "")} onChangeText={(v) => updMet(i, "value", v)} />
                  <TextInput className={`${inputCls} w-14`} placeholder="ĐV"
                    value={m.unit ?? ""} onChangeText={(v) => updMet(i, "unit", v)} />
                  <Pressable onPress={() => delMet(i)} hitSlop={8}><Text className="text-danger text-lg">✕</Text></Pressable>
                </View>
              </Card>
            ))}
            <Button size="sm" onPress={addMet}>＋ Thêm chỉ số</Button>
          </View>
        )}

        <Button variant="primary" block loading={saving} disabled={loading} onPress={save}>
          💾 Lưu vào hồ sơ
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
