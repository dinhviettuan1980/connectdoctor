import { useWindowDimensions, View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import Svg, { Rect, Text as SvgText, G, Line as SvgLine } from "react-native-svg";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Section } from "@/components/ui/Segmented";

const DAYS_FULL = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const BASE_COUNTS = [14, 18, 16, 21, 19, 8, 3];

function weekDate(weeksAgo: number, dayIndex: number): string {
  const d = new Date();
  const currentDow = d.getDay();
  const targetDow = dayIndex === 6 ? 0 : dayIndex + 1;
  let diff = currentDow - targetDow;
  if (diff < 0) diff += 7;
  d.setDate(d.getDate() - diff - weeksAgo * 7);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function buildWeekData(dayIndex: number) {
  const base = BASE_COUNTS[dayIndex];
  return Array.from({ length: 8 }, (_, i) => ({
    label: `T${8 - i}`,
    date: weekDate(7 - i, dayIndex),
    count: Math.max(0, base + Math.round(Math.sin(i * 1.9 + dayIndex * 0.7) * base * 0.28)),
  }));
}

export default function WeekdayDetail() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const { width } = useWindowDimensions();

  const dayIndex = Math.min(6, Math.max(0, parseInt(day ?? "0", 10)));
  const dayName = DAYS_FULL[dayIndex];
  const data = buildWeekData(dayIndex);

  const chartW = width - 64;
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const barMaxH = 100;
  const barW = Math.floor((chartW - 8) / data.length) - 4;
  const svgH = barMaxH + 34;
  const spacing = (chartW - 8 - barW * data.length) / Math.max(data.length - 1, 1);

  const total = data.reduce((s, d) => s + d.count, 0);
  const avg = Math.round(total / data.length);
  const peak = Math.max(...data.map((d) => d.count));
  const avgY = barMaxH - (avg / maxVal) * barMaxH;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title={dayName} subtitle="Tổng kết 8 tuần gần nhất" back />

        <View className="flex-row gap-2">
          <Card padding="sm" className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider text-ink-3">Tổng BN</Text>
            <Text className="font-mono font-bold text-2xl text-ink">{total}</Text>
          </Card>
          <Card padding="sm" className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider text-ink-3">Trung bình</Text>
            <Text className="font-mono font-bold text-2xl text-ink">{avg}</Text>
          </Card>
          <Card padding="sm" className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider text-ink-3">Cao nhất</Text>
            <Text className="font-mono font-bold text-2xl text-accent-ink">{peak}</Text>
          </Card>
        </View>

        <Card padding="md">
          <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-3">
            XU HƯỚNG 8 TUẦN
          </Text>
          <Svg width={chartW} height={svgH}>
            <SvgLine
              x1={0} y1={avgY} x2={chartW} y2={avgY}
              stroke="#c8c8c2" strokeWidth={1} strokeDasharray="4,4"
            />
            <SvgText x={chartW - 2} y={avgY - 3} fontSize={8} fill="#767676" textAnchor="end">
              TB {avg}
            </SvgText>
            {data.map((d, i) => {
              const bh = d.count > 0 ? Math.max(4, (d.count / maxVal) * barMaxH) : 2;
              const x = i * (barW + spacing);
              const y = barMaxH - bh;
              const isLatest = i === data.length - 1;
              return (
                <G key={i}>
                  <Rect
                    x={x} y={y} width={barW} height={bh} rx={4} ry={4}
                    fill={isLatest ? "#5eb594" : "#dceee4"}
                  />
                  <SvgText
                    x={x + barW / 2} y={barMaxH + 20}
                    fontSize={9} fill={isLatest ? "#2f6b54" : "#767676"}
                    textAnchor="middle" fontFamily="monospace"
                  >
                    {d.date}
                  </SvgText>
                  {d.count > 0 && (
                    <SvgText
                      x={x + barW / 2} y={y - 4}
                      fontSize={8} fill={isLatest ? "#2f6b54" : "#444444"} textAnchor="middle"
                    >
                      {d.count}
                    </SvgText>
                  )}
                </G>
              );
            })}
          </Svg>
        </Card>

        <Section title="CHI TIẾT TỪNG TUẦN">
          <Card padding="none">
            {data.map((d, i) => (
              <View
                key={i}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  i < data.length - 1 ? "border-b border-dashed border-line-soft" : ""
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="font-mono text-xs text-ink-3 w-5">{d.label}</Text>
                  <Text className="text-xs text-ink-2">{d.date}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="font-mono font-bold text-sm text-ink">{d.count}</Text>
                  <Text className="text-[11px] text-ink-3">BN</Text>
                  {i === data.length - 1 && <Chip variant="accent">Gần nhất</Chip>}
                </View>
              </View>
            ))}
          </Card>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
