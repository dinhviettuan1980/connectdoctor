import { View, Text, ScrollView, useWindowDimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Line, Circle, Rect, Text as SvgText, G } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { UserMenu } from "@/components/UserMenu";
import { colors } from "@/lib/theme";
import {
  fetchHealthDevices,
  fetchHealthHistory,
  fetchHealthAlerts,
  fetchHealthDaily,
  type HealthSyncRecord,
  type HealthAlertRecord,
  type HealthDailySummary,
} from "@/lib/healthApi";

// ─── Metric Cell ────────────────────────────────────────────────────────────

function MetricCell({
  label, value, unit, color,
}: {
  label: string; value: string; unit: string; color?: string;
}) {
  return (
    <View className="flex-1 items-center bg-paper2 rounded-lg p-2.5 gap-0.5">
      <Text className="text-[8px] font-bold text-ink-3 uppercase tracking-wider">{label}</Text>
      <Text className="text-base font-bold font-mono" style={{ color: color ?? colors.ink }}>
        {value}
      </Text>
      <Text className="text-[8px] text-ink-4">{unit}</Text>
    </View>
  );
}

// ─── HR Line Chart ───────────────────────────────────────────────────────────

function HRLineChart({ data, width }: { data: HealthSyncRecord[]; width: number }) {
  const h = 120;
  const padL = 30, padR = 8, padT = 10, padB = 26;
  const W = width - padL - padR;
  const H = h - padT - padB;

  const valid = data.filter((d) => d.hr > 0);
  if (valid.length < 2) {
    return (
      <View style={{ height: h, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.ink3, fontSize: 11 }}>Chưa có dữ liệu</Text>
      </View>
    );
  }

  const hrs = valid.map((d) => d.hr);
  const minHR = Math.max(40, Math.min(...hrs) - 8);
  const maxHR = Math.min(200, Math.max(...hrs) + 8);
  const range = maxHR - minHR || 1;

  const xScale = (i: number) => padL + (i / (data.length - 1)) * W;
  const yScale = (v: number) => padT + H - ((v - minHR) / range) * H;

  let pathD = "";
  data.forEach((d, i) => {
    if (d.hr <= 0) return;
    const px = xScale(i).toFixed(1);
    const py = yScale(d.hr).toFixed(1);
    const prev = data.slice(0, i).reverse().find((p) => p.hr > 0);
    if (!prev) pathD += `M${px},${py}`;
    else pathD += `L${px},${py}`;
  });

  const gridLines = [60, 90, 120].filter((v) => v > minHR && v < maxHR);
  const yLabels = [Math.round(minHR), 90, Math.round(maxHR)].filter(
    (v) => v >= minHR && v <= maxHR
  );

  const fmtTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <Svg width={width} height={h}>
      {/* Background grid */}
      {gridLines.map((v) => (
        <Line
          key={v}
          x1={padL} x2={padL + W}
          y1={yScale(v)} y2={yScale(v)}
          stroke={v === 60 || v === 120 ? colors.warn : colors.lineSoft}
          strokeWidth={v === 60 || v === 120 ? 1 : 0.5}
          strokeDasharray="3,3"
        />
      ))}
      {/* HR path */}
      <Path d={pathD} stroke={colors.accent} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Anomaly dots */}
      {data.map((d, i) => {
        if (d.hr <= 0 || (d.hr >= 60 && d.hr <= 120)) return null;
        return (
          <Circle
            key={i}
            cx={xScale(i)} cy={yScale(d.hr)}
            r={3}
            fill={d.hr > 120 ? colors.danger : colors.warn}
          />
        );
      })}
      {/* Y axis labels */}
      {yLabels.map((v) => (
        <SvgText key={v} x={padL - 3} y={yScale(v) + 3} fontSize={8} fill={colors.ink3} textAnchor="end">
          {v}
        </SvgText>
      ))}
      {/* X axis labels: first + last */}
      <SvgText x={padL} y={h - 4} fontSize={8} fill={colors.ink3} textAnchor="middle">
        {fmtTime(data[0].ts)}
      </SvgText>
      <SvgText x={padL + W} y={h - 4} fontSize={8} fill={colors.ink3} textAnchor="middle">
        {fmtTime(data[data.length - 1].ts)}
      </SvgText>
    </Svg>
  );
}

// ─── Daily Bar Chart ─────────────────────────────────────────────────────────

function DailyBarChart({ data, width }: { data: HealthDailySummary[]; width: number }) {
  const h = 90;
  const padL = 4, padR = 4, padT = 14, padB = 20;
  const items = [...data].reverse().slice(0, 7);
  const W = width - padL - padR;
  const H = h - padT - padB;

  if (items.length === 0) {
    return (
      <View style={{ height: h, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.ink3, fontSize: 11 }}>Chưa có dữ liệu</Text>
      </View>
    );
  }

  const maxHR = Math.max(...items.map((d) => d.avg_hr ?? 0), 100);
  const gap = 3;
  const barW = (W - gap * (items.length - 1)) / items.length;

  return (
    <Svg width={width} height={h}>
      {items.map((d, i) => {
        const avgHR = d.avg_hr ?? 0;
        const barH = Math.max(avgHR > 0 ? (avgHR / maxHR) * H : 0, 2);
        const x = padL + i * (barW + gap);
        const y = padT + H - barH;
        const fill = avgHR > 100 ? colors.warn : avgHR > 0 ? colors.accent : colors.lineSoft;
        return (
          <G key={d.date}>
            <Rect x={x} y={y} width={barW} height={barH} rx={2} fill={fill} />
            <SvgText x={x + barW / 2} y={padT + H + 12} fontSize={7} fill={colors.ink3} textAnchor="middle">
              {d.date.slice(5)}
            </SvgText>
            {avgHR > 0 && (
              <SvgText x={x + barW / 2} y={y - 3} fontSize={7} fill={colors.ink2} textAnchor="middle">
                {Math.round(avgHR)}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Alert Row ───────────────────────────────────────────────────────────────

function AlertRow({ item, isLast }: { item: HealthAlertRecord; isLast: boolean }) {
  const dt = new Date(item.ts * 1000);
  const time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}:${String(dt.getSeconds()).padStart(2, "0")}`;
  const isHigh = item.hr > 120;
  return (
    <View
      className="flex-row items-center py-2"
      style={!isLast ? { borderBottomWidth: 0.5, borderBottomColor: colors.lineSoft } : undefined}
    >
      <View
        className="w-1.5 h-1.5 rounded-full mr-2"
        style={{ backgroundColor: isHigh ? colors.danger : colors.warn }}
      />
      <Text className="font-mono text-[10px] text-ink-3 w-16">{time}</Text>
      <Text
        className="font-mono text-xs font-bold w-14"
        style={{ color: isHigh ? colors.danger : colors.warn }}
      >
        {item.hr} bpm
      </Text>
      <View className="flex-1 flex-row gap-1.5 justify-end">
        {item.activity === 1 && (
          <View className="bg-paper2 px-1.5 py-0.5 rounded">
            <Text className="text-[8px] text-ink-3">tập luyện</Text>
          </View>
        )}
        {item.spo2 > 0 && (
          <Text className="text-[9px] text-ink-3">SpO₂ {item.spo2}%</Text>
        )}
        {item.stress >= 0 && (
          <Text className="text-[9px] text-ink-3">stress {item.stress}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text className="text-[10px] font-bold text-ink-3 uppercase tracking-wider mb-1.5">{text}</Text>;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Health() {
  const { width } = useWindowDimensions();
  const chartWidth = width - 56; // 16*2 scroll pad + 12*2 card pad

  const { data: devices, isLoading: loadingDevices, isError: devError } = useQuery({
    queryKey: ["health-devices"],
    queryFn: fetchHealthDevices,
    retry: 1,
  });

  const device = devices?.[0];

  const { data: historyDesc = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["health-history", device],
    queryFn: () => fetchHealthHistory(device!),
    enabled: !!device,
    refetchInterval: 60_000,
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: alertsDesc = [] } = useQuery({
    queryKey: ["health-alerts", device, todayStr],
    queryFn: () => fetchHealthAlerts(device!, todayStr),
    enabled: !!device,
    refetchInterval: 60_000,
  });

  const { data: daily = [] } = useQuery({
    queryKey: ["health-daily", device],
    queryFn: () => fetchHealthDaily(device!, 7),
    enabled: !!device,
  });

  // history API returns DESC (newest first) — reverse for chart
  const history: HealthSyncRecord[] = [...historyDesc].reverse();
  const alerts: HealthAlertRecord[] = [...alertsDesc].reverse();

  const latest = historyDesc[0]; // newest = first in DESC result
  const latestHR = latest?.hr ?? 0;
  const hrColor =
    latestHR > 120 ? colors.danger : latestHR > 0 && latestHR < 60 ? colors.warn : colors.ink;

  const todayDaily = daily[0]; // daily is DESC by date

  if (loadingDevices || (!!device && loadingHistory)) {
    return (
      <SafeAreaView className="flex-1 bg-paper items-center justify-center">
        <ActivityIndicator color={colors.accent} size="large" />
        <Text className="text-xs text-ink-3 mt-3">Đang tải dữ liệu sức khỏe…</Text>
      </SafeAreaView>
    );
  }

  if (devError || !device) {
    return (
      <SafeAreaView className="flex-1 bg-paper items-center justify-center px-8 gap-3">
        <Text className="text-2xl">⌚</Text>
        <Text className="text-sm font-bold text-ink text-center">Chưa có dữ liệu từ đồng hồ</Text>
        <Text className="text-xs text-ink-3 text-center">
          Đảm bảo đồng hồ Garmin đã cài app HanoiWatch và đã đồng bộ ít nhất một lần.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Header */}
        <AppBar
          title="Sức khỏe"
          subtitle={`Garmin · ${device}`}
          right={<UserMenu />}
        />

        {/* ── Vitals row ── */}
        <View className="flex-row gap-1.5">
          <MetricCell
            label="Bước"
            value={latest?.steps ? latest.steps.toLocaleString("vi-VN") : "—"}
            unit="bước"
          />
          <MetricCell
            label="Calories"
            value={latest?.calories ? String(latest.calories) : "—"}
            unit="kcal"
          />
          <MetricCell
            label="Tim"
            value={latestHR > 0 ? String(latestHR) : "—"}
            unit="bpm"
            color={hrColor}
          />
          <MetricCell
            label="Tầng"
            value={latest?.floors != null ? String(latest.floors) : "—"}
            unit="floors"
          />
        </View>

        {/* ── Sensors row ── */}
        <View className="flex-row gap-1.5">
          <MetricCell
            label="SpO₂"
            value={latest?.spo2 > 0 ? `${latest.spo2}` : "—"}
            unit="%"
            color={latest?.spo2 > 0 && latest.spo2 < 95 ? colors.danger : undefined}
          />
          <MetricCell
            label="Stress"
            value={latest?.stress != null && latest.stress >= 0 ? String(latest.stress) : "—"}
            unit="/100"
            color={
              latest?.stress > 75 ? colors.danger
              : latest?.stress > 50 ? colors.warn
              : undefined
            }
          />
          <MetricCell
            label="Nhịp thở"
            value={latest?.resp_rate > 0 ? String(latest.resp_rate) : "—"}
            unit="lần/p"
          />
          <MetricCell
            label="Cảnh báo"
            value={String(alertsDesc.length)}
            unit="hôm nay"
            color={alertsDesc.length > 0 ? colors.danger : undefined}
          />
        </View>

        {/* ── HR 24h chart ── */}
        <Card padding="md">
          <SectionLabel text="Nhịp tim 24h gần nhất" />
          <HRLineChart data={history} width={chartWidth} />
          <View className="flex-row gap-3 mt-2">
            {[
              { color: colors.accent, label: "Bình thường (60–120)" },
              { color: colors.warn,   label: "Thấp (<60)" },
              { color: colors.danger, label: "Cao (>120)" },
            ].map((l) => (
              <View key={l.label} className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
                <Text className="text-[8px] text-ink-3">{l.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ── Daily 7-day trend ── */}
        <Card padding="md">
          <View className="flex-row justify-between items-start mb-1">
            <SectionLabel text="Xu hướng 7 ngày" />
            {todayDaily && (
              <Text className="text-[9px] text-ink-3">
                Hôm qua: {todayDaily.total_steps?.toLocaleString("vi-VN") ?? "—"} bước
              </Text>
            )}
          </View>
          <DailyBarChart data={daily} width={chartWidth} />
          {todayDaily && (
            <View className="flex-row justify-between mt-2">
              <Text className="text-[9px] text-ink-3">
                HR nghỉ: {todayDaily.resting_hr ?? "—"} bpm
              </Text>
              <Text className="text-[9px] text-ink-3">
                Stress TB: {todayDaily.avg_stress != null ? Math.round(todayDaily.avg_stress) : "—"}
              </Text>
              <Text className="text-[9px] text-ink-3">
                SpO₂ TB: {todayDaily.avg_spo2 != null ? `${Math.round(todayDaily.avg_spo2)}%` : "—"}
              </Text>
            </View>
          )}
        </Card>

        {/* ── Today's alerts ── */}
        <Card padding="md">
          <View className="flex-row justify-between items-center mb-1">
            <SectionLabel text={`Cảnh báo hôm nay · ${todayStr}`} />
            <Text className="text-[9px] font-mono font-bold" style={{
              color: alertsDesc.length > 0 ? colors.danger : colors.ink3,
            }}>
              {alertsDesc.length} sự kiện
            </Text>
          </View>
          {alerts.length === 0 ? (
            <View className="py-4 items-center">
              <Text className="text-xs text-ink-3">Không có cảnh báo hôm nay ✓</Text>
            </View>
          ) : (
            alerts.slice(-30).reverse().map((a, i, arr) => (
              <AlertRow key={a.id} item={a} isLast={i === arr.length - 1} />
            ))
          )}
        </Card>

        {/* ── Footer ── */}
        <View className="items-center pb-2">
          <Text className="text-[9px] text-ink-4">
            Đồng bộ mỗi 5 phút
            {latest?.created_at
              ? ` · cập nhật lúc ${new Date(latest.created_at + "Z").toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
