import { useWindowDimensions, View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Rect, Text as SvgText, G } from "react-native-svg";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Segmented";

const DAYS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DAYS_FULL = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const WEEKDAY_AVGS = [14, 18, 16, 21, 19, 8, 3];

export default function WeekdayStats() {
  const { width } = useWindowDimensions();
  const router = useRouter();

  const chartW = width - 64;
  const maxVal = Math.max(...WEEKDAY_AVGS);
  const barMaxH = 120;
  const barW = Math.floor((chartW - 8) / WEEKDAY_AVGS.length) - 5;
  const svgH = barMaxH + 34;
  const spacing = (chartW - 8 - barW * WEEKDAY_AVGS.length) / Math.max(WEEKDAY_AVGS.length - 1, 1);

  const todayDow = new Date().getDay();
  const todayIndex = todayDow === 0 ? 6 : todayDow - 1;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title="Thống kê theo ngày" subtitle="Số bệnh nhân TB / 8 tuần · nhấn cột để xem chi tiết" back />

        <Card padding="md">
          <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-3">
            TRUNG BÌNH MỖI NGÀY TRONG TUẦN
          </Text>
          <Svg width={chartW} height={svgH}>
            {WEEKDAY_AVGS.map((val, i) => {
              const bh = Math.max(4, (val / maxVal) * barMaxH);
              const x = i * (barW + spacing);
              const y = barMaxH - bh;
              const isToday = i === todayIndex;
              return (
                <G key={i} onPress={() => router.push(`/(doctor)/weekday-stats/${i}` as any)}>
                  <Rect x={x} y={0} width={barW} height={svgH} fill="transparent" />
                  <Rect
                    x={x} y={y} width={barW} height={bh} rx={6} ry={6}
                    fill={isToday ? "#5eb594" : "#dceee4"}
                  />
                  {val > 0 && (
                    <SvgText
                      x={x + barW / 2} y={y - 5}
                      fontSize={9} fill={isToday ? "#2f6b54" : "#444444"} textAnchor="middle"
                      fontWeight={isToday ? "700" : "400"}
                    >
                      {val}
                    </SvgText>
                  )}
                  <SvgText
                    x={x + barW / 2} y={barMaxH + 20}
                    fontSize={11} fill={isToday ? "#2f6b54" : "#767676"} textAnchor="middle"
                    fontWeight={isToday ? "700" : "400"}
                  >
                    {DAYS_SHORT[i]}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </Card>

        <Section title="THEO TỪNG NGÀY">
          <View className="gap-1.5">
            {WEEKDAY_AVGS.map((val, i) => (
              <Pressable key={i} onPress={() => router.push(`/(doctor)/weekday-stats/${i}` as any)}>
                <Card padding="md">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`w-9 h-9 rounded-lg items-center justify-center ${i === todayIndex ? "bg-accent" : "bg-accent-soft"}`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${i === todayIndex ? "text-ink" : "text-accent-ink"}`}
                        >
                          {DAYS_SHORT[i]}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold text-ink">{DAYS_FULL[i]}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="font-mono font-bold text-base text-ink">{val}</Text>
                      <Text className="text-[11px] text-ink-3">BN/buổi</Text>
                      <Text className="text-ink-4 text-xs ml-1">›</Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
