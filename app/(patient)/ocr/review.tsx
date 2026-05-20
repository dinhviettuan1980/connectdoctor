import { useEffect, useState } from "react";
import { View, Text, ScrollView, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { extractMedsFromImage, extractMetricsFromImage } from "@/lib/ocr";
import type { Medication, MetricEntry } from "@/lib/types";

export default function OcrReview() {
  const router = useRouter();
  const { uri, kind } = useLocalSearchParams<{ uri: string; kind: string }>();
  const [loading, setLoading] = useState(true);
  const [meds, setMeds] = useState<Partial<Medication>[]>([]);
  const [metrics, setMetrics] = useState<Partial<MetricEntry>[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (kind === "metrics") {
        setMetrics(await extractMetricsFromImage(uri));
      } else {
        setMeds(await extractMedsFromImage(uri));
      }
      setLoading(false);
    })();
  }, [uri, kind]);

  const isMeds = kind !== "metrics";
  const count = isMeds ? meds.length : metrics.length;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar
          title={isMeds ? "Kiểm tra đơn thuốc" : "Kết quả phiếu XN"}
          subtitle="Bước 2/3 · Review"
          back
        />

        <View className="flex-row gap-3">
          <Image
            source={{ uri }}
            style={{ width: 80, height: 100, borderRadius: 8, borderWidth: 1, borderColor: "#c8c8c2" }}
            resizeMode="cover"
          />
          <View className="flex-1 gap-1">
            {loading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" />
                <Text className="text-xs text-ink-3">AI đang đọc ảnh…</Text>
              </View>
            ) : (
              <>
                <Chip variant="accent">✓ {count} mục đọc được</Chip>
                <Text className="text-[11px] text-ink-3 mt-1">
                  Độ tin cậy ~92%. Xem lại trước khi lưu.
                </Text>
              </>
            )}
          </View>
        </View>

        {!loading && isMeds && (
          <View className="gap-1.5">
            {meds.map((m, i) => (
              <Card key={i} padding="md">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-ink">{m.name}</Text>
                    <Text className="text-[11px] text-ink-3">{m.dose}</Text>
                  </View>
                  {m.category && <Chip variant="soft">{m.category}</Chip>}
                </View>
              </Card>
            ))}
          </View>
        )}

        {!loading && !isMeds && (
          <Card padding="none">
            <View className="flex-row px-3 py-2 bg-paper-2 border-b border-line-soft">
              <Text className="flex-[2] text-[10px] font-bold uppercase tracking-wider text-ink-3">
                Chỉ số
              </Text>
              <Text className="flex-1 text-[10px] font-bold text-right uppercase text-ink-3">
                Giá trị
              </Text>
            </View>
            {metrics.map((m, i) => (
              <View
                key={i}
                className="flex-row items-center px-3 py-2 border-t border-dashed border-line-soft"
              >
                <Text className="flex-[2] text-xs text-ink">{m.label}</Text>
                <Text className="flex-1 text-xs font-mono text-right text-ink">
                  {m.value} {m.unit}
                </Text>
              </View>
            ))}
          </Card>
        )}

        <View className="flex-row gap-2">
          <Button block onPress={() => router.back()}>＋ Sửa</Button>
          <Button
            variant="primary"
            block
            disabled={loading}
            onPress={() => router.replace({ pathname: "/(patient)/ocr/confirm", params: { kind } })}
          >
            Xác nhận →
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
