import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Section } from "@/components/ui/Segmented";

const API = "https://api.tuandv.id.vn";

function toVNDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isAfter1815VN() {
  const now = new Date();
  const vnMins = (now.getUTCHours() * 60 + now.getUTCMinutes() + 7 * 60) % 1440;
  return vnMins >= 18 * 60 + 15;
}

type HistoryData = {
  g0?: string;
  g1?: string;
  g2?: string;
  g3?: string;
  g4?: string;
  g5?: string;
  g6?: string;
  g7?: string;
  headToTail?: Record<string, string>;
  tailToHead?: Record<string, string>;
};

function PrizeRow({ label, value, special }: { label: string; value?: string; special?: boolean }) {
  const nums = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (nums.length === 0) return null;
  return (
    <View className="flex-row border-b border-line-soft py-2 px-3">
      <View className="w-8 items-center justify-center">
        <Text className={`text-[11px] font-bold ${special ? "text-warn" : "text-ink-3"}`}>{label}</Text>
      </View>
      <View className="flex-1 flex-row flex-wrap gap-1.5 justify-center">
        {nums.map((n, i) => (
          <View
            key={i}
            className={`px-2 py-0.5 rounded-lg border ${
              special
                ? "bg-warn border-warn"
                : "bg-paper border-line-soft"
            }`}
          >
            <Text className={`font-mono font-bold text-xs ${special ? "text-ink" : "text-ink"}`}>
              <Text className="text-ink-2">{n.slice(0, -2)}</Text>
              <Text className="text-danger">{n.slice(-2)}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function LotteryScreen() {
  const today = toVNDate(new Date());
  const yesterday = toVNDate(new Date(Date.now() - 86400000));
  const [date, setDate] = useState(isAfter1815VN() ? today : yesterday);
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [ongPhong, setOngPhong] = useState<string[]>([]);
  const [pascal, setPascal] = useState<string[]>([]);
  const [absent, setAbsent] = useState<{ number: string; days_absent: number }[]>([]);
  const [ganThreshold, setGanThreshold] = useState(10);
  const isLive = isAfter1815VN() && date === today;
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const fetchAll = async (d: string) => {
    setLoading(true);
    try {
      const [hist, phong, pasc, abs] = await Promise.allSettled([
        fetch(`${API}/api/history?date=${d}`).then((r) => r.json()),
        fetch(`${API}/api/cau-ong-phong`).then((r) => r.json()),
        fetch(`${API}/api/cau-lo-pascal`).then((r) => r.json()),
        fetch(`${API}/api/statistics/longest-absent?days=60`).then((r) => r.json()),
      ]);
      if (hist.status === "fulfilled") setData(hist.value);
      if (phong.status === "fulfilled") setOngPhong(phong.value?.predictions ?? []);
      if (pasc.status === "fulfilled") setPascal(pasc.value?.predictions ?? []);
      if (abs.status === "fulfilled") setAbsent(abs.value ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(date);
  }, [date]);

  useEffect(() => {
    if (!isLive) {
      clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => fetchAll(date), 30000);
    return () => clearInterval(pollRef.current);
  }, [isLive, date]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    const s = toVNDate(d);
    if (s <= today) setDate(s);
  };

  const GAN_STEPS = [5, 7, 10, 14, 20, 25, 30];
  const filteredAbsent = absent.filter((a) => a.days_absent >= ganThreshold);

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title="Xổ Số Miền Bắc" subtitle="XSMB · kết quả hàng ngày" back />

        {/* Date nav */}
        <Card padding="sm">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => shiftDate(-1)}
              className="w-9 h-9 items-center justify-center rounded-lg bg-accent-soft"
            >
              <Text className="text-accent-ink font-bold text-lg">‹</Text>
            </Pressable>
            <View className="items-center">
              <Text className="font-mono font-bold text-sm text-ink">{date}</Text>
              {isLive && (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <View className="w-2 h-2 rounded-full bg-danger" />
                  <Text className="text-[10px] text-danger font-bold">TRỰC TIẾP</Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => shiftDate(1)}
              disabled={date >= today}
              className="w-9 h-9 items-center justify-center rounded-lg bg-accent-soft"
              style={{ opacity: date >= today ? 0.3 : 1 }}
            >
              <Text className="text-accent-ink font-bold text-lg">›</Text>
            </Pressable>
          </View>
        </Card>

        {/* Prediction cards */}
        <View className="flex-row gap-2">
          <Card variant="accent" padding="sm" className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider font-bold text-accent-ink mb-1">
              Cầu Ông Phong
            </Text>
            {ongPhong.length > 0 ? (
              <View className="flex-row flex-wrap gap-1">
                {ongPhong.map((n) => (
                  <Text key={n} className="font-mono font-bold text-xs text-accent-ink">{n}</Text>
                ))}
              </View>
            ) : (
              <Text className="text-xs text-ink-4">Đang tải…</Text>
            )}
          </Card>
          <Card variant="soft" padding="sm" className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider font-bold text-danger mb-1">
              Cầu Pascal
            </Text>
            {pascal.length > 0 ? (
              <View className="flex-row flex-wrap gap-1">
                {pascal.map((n) => (
                  <Text key={n} className="font-mono font-bold text-xs text-danger">{n}</Text>
                ))}
              </View>
            ) : (
              <Text className="text-xs text-ink-4">Đang tải…</Text>
            )}
          </Card>
        </View>

        {/* Lô Gan */}
        <Card padding="sm">
          <View className="flex-row items-center gap-2 mb-2">
            <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-2">Lô Gan ≥</Text>
            <View className="flex-row gap-1">
              {GAN_STEPS.map((v) => (
                <Pressable key={v} onPress={() => setGanThreshold(v)}>
                  <View
                    className={`px-2 py-0.5 rounded-full border ${
                      ganThreshold === v
                        ? "bg-accent border-accent-ink"
                        : "bg-paper border-line-soft"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        ganThreshold === v ? "text-ink" : "text-ink-3"
                      }`}
                    >
                      {v}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {filteredAbsent.length === 0 ? (
              <Text className="text-xs text-ink-4">Không có số nào vắng ≥ {ganThreshold} ngày</Text>
            ) : (
              filteredAbsent.map((item) => (
                <View key={item.number} className="flex-row items-start px-2 py-0.5 rounded-full border border-line-soft bg-paper">
                  <Text className="font-mono font-bold text-xs text-ink">{item.number}</Text>
                  <Text className="font-mono text-[9px] text-danger font-bold">{item.days_absent}</Text>
                </View>
              ))
            )}
          </View>
        </Card>

        {/* Results table */}
        <Section title={`KẾT QUẢ ${date}`}>
          {loading && !data ? (
            <ActivityIndicator size="small" className="py-6" />
          ) : data ? (
            <Card padding="none">
              {/* Special prize */}
              {data.g0 && (
                <View className="flex-row border-b border-line-soft py-3 px-3 bg-accent-soft">
                  <View className="w-8 items-center justify-center">
                    <Text className="text-[11px] font-bold text-accent-ink">ĐB</Text>
                  </View>
                  <View className="flex-1 items-center">
                    <View className="bg-danger px-5 py-1.5 rounded-xl">
                      <Text className="font-mono font-bold text-2xl text-paper tracking-widest">
                        {data.g0}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              <PrizeRow label="1" value={data.g1} />
              <PrizeRow label="2" value={data.g2} />
              <PrizeRow label="3" value={data.g3} />
              <PrizeRow label="4" value={data.g4} />
              <PrizeRow label="5" value={data.g5} />
              <PrizeRow label="6" value={data.g6} />
              <PrizeRow label="7" value={data.g7} />
            </Card>
          ) : (
            <Card variant="soft" padding="md">
              <Text className="text-xs text-ink-3 text-center">Chưa có kết quả cho ngày này</Text>
            </Card>
          )}
        </Section>

        {/* Head-tail tables */}
        {data?.headToTail && data?.tailToHead && (
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1.5">ĐẦU → ĐUÔI</Text>
              <Card padding="none">
                {Object.entries(data.headToTail).map(([k, v], i, arr) => (
                  <View
                    key={k}
                    className={`flex-row px-3 py-1.5 ${i < arr.length - 1 ? "border-b border-line-soft" : ""}`}
                  >
                    <Text className="font-mono font-bold text-xs text-danger w-5">{k}</Text>
                    <Text className="font-mono text-xs text-ink-2">{v}</Text>
                  </View>
                ))}
              </Card>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1.5">ĐUÔI → ĐẦU</Text>
              <Card padding="none">
                {Object.entries(data.tailToHead).map(([k, v], i, arr) => (
                  <View
                    key={k}
                    className={`flex-row px-3 py-1.5 ${i < arr.length - 1 ? "border-b border-line-soft" : ""}`}
                  >
                    <Text className="font-mono font-bold text-xs text-danger w-5">{k}</Text>
                    <Text className="font-mono text-xs text-ink-2">{v}</Text>
                  </View>
                ))}
              </Card>
            </View>
          </View>
        )}

        {loading && data && (
          <View className="flex-row items-center gap-2 justify-center">
            <ActivityIndicator size="small" />
            <Text className="text-xs text-ink-3">Đang cập nhật…</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
