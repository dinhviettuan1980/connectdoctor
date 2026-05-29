import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Path,
  Circle,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  G,
  Line as SvgLine,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/hooks/useAuth";
import {
  fetchHealthDevices,
  fetchHealthHistory,
  fetchHealthDaily,
  type HealthSyncRecord,
  type HealthDailySummary,
} from "@/lib/healthApi";
import HealthMap from "@/components/HealthMap";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const C = {
  bg0: "#07080B",
  bg1: "#0E1016",
  bg2: "#14171F",
  glass: "rgba(255,255,255,0.04)",
  glass2: "rgba(255,255,255,0.06)",
  line: "rgba(255,255,255,0.08)",
  line2: "rgba(255,255,255,0.14)",
  ink0: "#F4F5F8",
  ink1: "#C7CAD3",
  ink2: "#8B8F9C",
  ink3: "#5A5E6B",
  hr: "#FF3B5C",
  hr2: "#FF7A8A",
  blue: "#5BB4FF",
  orange: "#FFA552",
  green: "#4ADE80",
  purple: "#B287FF",
  yellow: "#FACC15",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = "1H" | "3H" | "6H" | "12H" | "24H" | "7D";

const RANGES: Range[] = ["1H", "3H", "6H", "12H", "24H", "7D"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(pts.length - 1, i + 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.round(i * step)]);
}

function filterSeries(historyAsc: HealthSyncRecord[], range: Range): HealthSyncRecord[] {
  if (range === "7D") return historyAsc;
  const hours: Record<Exclude<Range, "7D">, number> = {
    "1H": 1, "3H": 3, "6H": 6, "12H": 12, "24H": 24,
  };
  const h = hours[range as Exclude<Range, "7D">];
  const cutoff = Date.now() / 1000 - h * 3600;
  return historyAsc.filter((r) => r.ts >= cutoff && r.hr > 0);
}

function bpmToHeatColor(bpm: number): string {
  if (bpm === 0) return "rgba(255,255,255,0.04)";
  const t = Math.max(0, Math.min(1, (bpm - 50) / 80));
  const lerp = (a: number[], b: number[], u: number) =>
    `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)})`;
  if (t < 0.33) return lerp([26, 42, 58], [74, 111, 165], t / 0.33);
  if (t < 0.67) return lerp([74, 111, 165], [255, 165, 82], (t - 0.33) / 0.34);
  return lerp([255, 165, 82], [255, 59, 92], (t - 0.67) / 0.33);
}

function fmtHM(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function hrZone(bpm: number): { label: string; color: string } {
  if (bpm < 60) return { label: "Rest", color: C.blue };
  if (bpm <= 90) return { label: "Normal", color: C.green };
  if (bpm <= 115) return { label: "Active", color: C.yellow };
  if (bpm <= 145) return { label: "Cardio", color: C.orange };
  return { label: "Peak", color: C.hr };
}

interface ZoneData {
  label: string;
  color: string;
  range: string;
  count: number;
  pct: number;
}

function computeZones(series: HealthSyncRecord[]): ZoneData[] {
  const valid = series.filter((r) => r.hr > 0);
  const total = valid.length || 1;
  const buckets = [
    { label: "Rest", color: C.blue, range: "<60", min: 0, max: 60 },
    { label: "Normal", color: C.green, range: "60–90", min: 60, max: 91 },
    { label: "Active", color: C.yellow, range: "90–115", min: 91, max: 116 },
    { label: "Cardio", color: C.orange, range: "115–145", min: 116, max: 146 },
    { label: "Peak", color: C.hr, range: ">145", min: 146, max: 999 },
  ];
  return buckets.map((b) => {
    const count = valid.filter((r) => r.hr >= b.min && r.hr < b.max).length;
    return { ...b, count, pct: Math.round((count / total) * 100) };
  });
}

interface KpiData {
  avgHr: number;
  maxHr: number;
  minHr: number;
  restingHr: number | null;
  stress: number;
  recovery: number;
  sleep: number;
  readiness: number;
}

function computeKpis(series: HealthSyncRecord[], today: HealthDailySummary | undefined): KpiData {
  const valid = series.filter((r) => r.hr > 0).map((r) => r.hr);
  const avgHr = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  const maxHr = valid.length ? Math.max(...valid) : 0;
  const minHr = valid.length ? Math.min(...valid) : 0;
  return {
    avgHr,
    maxHr,
    minHr,
    restingHr: today?.resting_hr ?? null,
    stress: today?.avg_stress != null ? Math.round(today.avg_stress) : 42,
    recovery: 78,
    sleep: 84,
    readiness: 76,
  };
}

function computeHeatmap(historyAsc: HealthSyncRecord[]): number[] {
  const buckets = new Array(24).fill(0);
  const counts = new Array(24).fill(0);
  for (const r of historyAsc) {
    if (r.hr > 0) {
      const h = new Date(r.ts * 1000).getHours();
      buckets[h] += r.hr;
      counts[h]++;
    }
  }
  return buckets.map((sum, i) => (counts[i] > 0 ? Math.round(sum / counts[i]) : 0));
}

// ─── Card Shell ───────────────────────────────────────────────────────────────

function DarkCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          backgroundColor: C.bg1,
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: C.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Text style={{ color: C.ink0, fontSize: 15, fontWeight: "600", marginBottom: 12 }}>
      {text}
    </Text>
  );
}

function SubLabel({ text }: { text: string }) {
  return (
    <Text style={{ color: C.ink2, fontSize: 12, marginBottom: 12 }}>{text}</Text>
  );
}

// ─── Pulse Dot ────────────────────────────────────────────────────────────────

function PulseDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.6, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: 8, height: 8, borderRadius: 4, backgroundColor: C.hr },
        animStyle,
      ]}
    />
  );
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────

function MiniSparkline({
  values,
  color,
  width = 56,
  height = 18,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const valid = values.filter((v) => v > 0);
  if (valid.length < 2) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }));
  return (
    <Svg width={width} height={height}>
      <Path d={smoothPath(pts)} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Hero BPM Card ────────────────────────────────────────────────────────────

function HeroBpmCard({
  bpm,
  sparkData,
  device,
  chartWidth,
}: {
  bpm: number;
  sparkData: HealthSyncRecord[];
  device: string;
  chartWidth: number;
}) {
  const zone = hrZone(bpm);
  const [liveTime, setLiveTime] = useState(nowHM());

  useEffect(() => {
    const id = setInterval(() => setLiveTime(nowHM()), 30000);
    return () => clearInterval(id);
  }, []);

  const sparkPts = sparkData
    .filter((r) => r.hr > 0)
    .slice(-20);

  const sparkMin = sparkPts.length ? Math.min(...sparkPts.map((r) => r.hr)) - 5 : 40;
  const sparkMax = sparkPts.length ? Math.max(...sparkPts.map((r) => r.hr)) + 5 : 180;
  const sparkRange = sparkMax - sparkMin || 1;
  const sparkH = 36;

  const pts = sparkPts.map((r, i) => ({
    x: (i / Math.max(sparkPts.length - 1, 1)) * chartWidth,
    y: sparkH - ((r.hr - sparkMin) / sparkRange) * sparkH,
  }));

  return (
    <View
      style={{
        backgroundColor: "#1A0F14",
        borderRadius: 28,
        borderWidth: 1,
        borderColor: "rgba(255,59,92,0.18)",
        padding: 20,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <PulseDot />
          <Text style={{ color: C.ink2, fontSize: 12 }}>Live · {liveTime}</Text>
        </View>
        <Text style={{ color: C.ink3, fontSize: 10, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" }}>
          Heart Rate
        </Text>
      </View>

      <View style={{ alignItems: "center", gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 80, fontWeight: "800", lineHeight: 88 }}>
            {bpm > 0 ? bpm : "—"}
          </Text>
          <Text style={{ color: C.ink1, fontSize: 14, marginBottom: 16 }}>BPM</Text>
        </View>
        <View
          style={{
            backgroundColor: `${zone.color}22`,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: `${zone.color}44`,
          }}
        >
          <Text style={{ color: zone.color, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 }}>
            {zone.label}
          </Text>
        </View>
      </View>

      {pts.length >= 2 && (
        <Svg width={chartWidth} height={sparkH}>
          <Path
            d={smoothPath(pts)}
            stroke={C.hr2}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      )}
    </View>
  );
}

// ─── Range Pills ─────────────────────────────────────────────────────────────

function RangePills({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: C.bg2,
        borderRadius: 14,
        padding: 4,
        gap: 2,
      }}
    >
      {RANGES.map((r) => (
        <View
          key={r}
          style={{
            flex: 1,
            backgroundColor: value === r ? "rgba(255,59,92,0.2)" : "transparent",
            borderRadius: 10,
            paddingVertical: 6,
            alignItems: "center",
          }}
        >
          <Text
            onPress={() => onChange(r)}
            style={{
              color: value === r ? "#FFFFFF" : C.ink2,
              fontSize: 11,
              fontWeight: value === r ? "700" : "400",
            }}
          >
            {r}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── HR Area Chart ────────────────────────────────────────────────────────────

function HRAreaChart({
  series,
  daily,
  range,
  chartWidth,
}: {
  series: HealthSyncRecord[];
  daily: HealthDailySummary[];
  range: Range;
  chartWidth: number;
}) {
  const totalH = 222;
  const padL = 28, padR = 8, padT = 20, padB = 20;
  const labelH = 22;
  const chartH = totalH - labelH;
  const W = chartWidth - padL - padR;
  const H = chartH - padT - padB;

  const is7D = range === "7D";

  const dailyReversed = useMemo(() => [...daily].reverse(), [daily]);

  const pts7D: { x: number; y: number; label: string; val: number }[] = useMemo(() => {
    if (!is7D || dailyReversed.length === 0) return [];
    const items = dailyReversed.slice(0, 7);
    const vals = items.map((d) => d.avg_hr ?? 0).filter((v) => v > 0);
    if (vals.length === 0) return [];
    return items
      .map((d, i) => ({ val: d.avg_hr ?? 0, label: d.date.slice(5), idx: i, total: items.length }))
      .filter((d) => d.val > 0)
      .map((d) => ({
        x: padL + (d.idx / Math.max(d.total - 1, 1)) * W,
        y: 0,
        label: d.label,
        val: d.val,
      }));
  }, [is7D, dailyReversed, W]);

  const valid = useMemo(() => {
    if (is7D) return [];
    return downsample(series.filter((r) => r.hr > 0), 80);
  }, [is7D, series]);

  const allVals = is7D
    ? pts7D.map((p) => p.val)
    : valid.map((r) => r.hr);

  if (allVals.length < 2) {
    return (
      <View style={{ height: totalH, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.ink3, fontSize: 12 }}>Chưa có dữ liệu</Text>
      </View>
    );
  }

  const minV = Math.max(30, Math.min(...allVals) - 10);
  const maxV = Math.min(220, Math.max(...allVals) + 10);
  const vRange = maxV - minV || 1;

  const yS = (v: number) => padT + H - ((v - minV) / vRange) * H;
  const xS = (i: number, total: number) => padL + (i / Math.max(total - 1, 1)) * W;

  const chartPts = is7D
    ? pts7D.map((p) => ({ x: p.x, y: yS(p.val) }))
    : valid.map((r, i) => ({ x: xS(i, valid.length), y: yS(r.hr) }));

  const linePath = smoothPath(chartPts);
  const areaPath =
    linePath +
    ` L${chartPts[chartPts.length - 1].x.toFixed(1)},${(padT + H).toFixed(1)}` +
    ` L${chartPts[0].x.toFixed(1)},${(padT + H).toFixed(1)} Z`;

  const gridVals = [
    Math.round(minV),
    Math.round(minV + vRange * 0.33),
    Math.round(minV + vRange * 0.66),
    Math.round(maxV),
  ];

  const resting = is7D ? (daily[0]?.resting_hr ?? 0) : (series.find((r) => r.hr > 0) ? (daily[0]?.resting_hr ?? 0) : 0);
  const restY = resting > 0 ? yS(resting) : -1;

  const peakPt = chartPts.reduce((a, b) => (b.y < a.y ? b : a), chartPts[0]);

  const xLabelIndices = [0, Math.floor(chartPts.length * 0.25), Math.floor(chartPts.length * 0.5), Math.floor(chartPts.length * 0.75), chartPts.length - 1];

  return (
    <Svg width={chartWidth} height={totalH}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={C.hr} stopOpacity={0.55} />
          <Stop offset="55%" stopColor={C.hr} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={C.hr} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={C.hr2} />
          <Stop offset="100%" stopColor={C.hr} />
        </LinearGradient>
      </Defs>

      {gridVals.map((v) => {
        const y = yS(v);
        return (
          <G key={v}>
            <SvgLine
              x1={padL} x2={padL + W}
              y1={y} y2={y}
              stroke={C.line2}
              strokeWidth={0.5}
            />
            <SvgText
              x={padL - 3}
              y={y + 3}
              fontSize={9}
              fill={C.ink3}
              textAnchor="end"
              fontFamily="monospace"
            >
              {v}
            </SvgText>
          </G>
        );
      })}

      {restY > 0 && (
        <G>
          <SvgLine
            x1={padL} x2={padL + W}
            y1={restY} y2={restY}
            stroke={C.blue}
            strokeWidth={1}
            strokeDasharray="3,4"
            opacity={0.5}
          />
          <SvgText
            x={padL + W - 2}
            y={restY - 3}
            fontSize={8}
            fill={C.blue}
            textAnchor="end"
            fontFamily="monospace"
          >
            rest {resting}
          </SvgText>
        </G>
      )}

      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path d={linePath} stroke="url(#lineGrad)" strokeWidth={2.25} fill="none" strokeLinecap="round" />

      <Circle cx={peakPt.x} cy={peakPt.y} r={5} fill="rgba(255,59,92,0.18)" />
      <Circle cx={peakPt.x} cy={peakPt.y} r={3} fill={C.hr} stroke="white" strokeWidth={1.25} />

      {xLabelIndices.map((idx) => {
        if (idx >= chartPts.length) return null;
        const pt = chartPts[idx];
        let labelStr = "";
        if (is7D) {
          labelStr = pts7D.filter((p) => p.val > 0)[idx]?.label ?? "";
        } else if (valid[idx]) {
          labelStr = fmtHM(valid[idx].ts);
        }
        if (!labelStr) return null;
        return (
          <SvgText
            key={idx}
            x={pt.x}
            y={chartH + 14}
            fontSize={9}
            fill={C.ink3}
            textAnchor="middle"
            fontFamily="monospace"
          >
            {labelStr}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ─── KPI Grid ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  unit,
  color,
  spark,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  spark: number[];
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.glass2,
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: C.line,
        minHeight: 88,
      }}
    >
      <Text style={{ color: C.ink2, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, marginBottom: 2 }}>
        <Text style={{ color: C.ink0, fontSize: 26, fontWeight: "700", lineHeight: 30 }}>
          {value}
        </Text>
      </View>
      <Text style={{ color: C.ink3, fontSize: 11 }}>{unit}</Text>
      <View style={{ position: "absolute", bottom: 10, right: 10 }}>
        <MiniSparkline values={spark} color={color} width={56} height={18} />
      </View>
    </View>
  );
}

function KpiGrid({
  kpis,
  sparkHr,
}: {
  kpis: KpiData;
  sparkHr: number[];
}) {
  const cards = [
    { label: "Avg HR", value: kpis.avgHr > 0 ? String(kpis.avgHr) : "—", unit: "bpm", color: C.hr },
    { label: "Max HR", value: kpis.maxHr > 0 ? String(kpis.maxHr) : "—", unit: "bpm", color: C.orange },
    { label: "Min HR", value: kpis.minHr > 0 ? String(kpis.minHr) : "—", unit: "bpm", color: C.blue },
    { label: "Resting", value: kpis.restingHr != null ? String(kpis.restingHr) : "—", unit: "bpm", color: C.green },
    { label: "Stress", value: String(kpis.stress), unit: "/100", color: C.orange },
    { label: "Recovery", value: String(kpis.recovery), unit: "%", color: C.green },
    { label: "Sleep", value: String(kpis.sleep), unit: "score", color: C.blue },
    { label: "Readiness", value: String(kpis.readiness), unit: "score", color: C.purple },
  ];

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {cards.slice(0, 2).map((c) => (
          <KpiCard key={c.label} {...c} spark={sparkHr} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {cards.slice(2, 4).map((c) => (
          <KpiCard key={c.label} {...c} spark={sparkHr} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {cards.slice(4, 6).map((c) => (
          <KpiCard key={c.label} {...c} spark={sparkHr} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {cards.slice(6, 8).map((c) => (
          <KpiCard key={c.label} {...c} spark={sparkHr} />
        ))}
      </View>
    </View>
  );
}

// ─── Zone Donut ──────────────────────────────────────────────────────────────

function ZoneDonut({
  zones,
  range,
  series,
}: {
  zones: ZoneData[];
  range: Range;
  series: HealthSyncRecord[];
}) {
  const size = 130;
  const r = 57;
  const cx = 65;
  const cy = 65;
  const sw = 16;
  const circum = 2 * Math.PI * r;

  const totalActive = useMemo(() => {
    return Math.round(series.filter((s) => s.hr >= 60).length * 5);
  }, [series]);

  const normalPct = zones.find((z) => z.label === "Normal")?.pct ?? 0;

  let offset = 0;
  const arcs = zones.map((z) => {
    const dash = (z.pct / 100) * circum;
    const gap = circum - dash;
    const arc = { ...z, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <DarkCard>
      <Label text={`Phân bố HR · ${range} · ${totalActive}m hoạt động`} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={sw}
            fill="none"
          />
          {arcs.map((z) =>
            z.pct > 0 ? (
              <Circle
                key={z.label}
                cx={cx}
                cy={cy}
                r={r}
                stroke={z.color}
                strokeWidth={sw}
                fill="none"
                strokeDasharray={`${z.dash.toFixed(1)} ${z.gap.toFixed(1)}`}
                strokeDashoffset={-z.offset}
                rotation={-90}
                origin={`${cx},${cy}`}
                strokeLinecap="butt"
              />
            ) : null,
          )}
          <SvgText
            x={cx}
            y={cy - 6}
            fontSize={22}
            fontWeight="700"
            fill={C.ink0}
            textAnchor="middle"
          >
            {normalPct}%
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 10}
            fontSize={9}
            fill={C.ink3}
            textAnchor="middle"
            letterSpacing={1}
          >
            NORMAL
          </SvgText>
        </Svg>

        <View style={{ flex: 1, gap: 8 }}>
          {zones.map((z) => (
            <View key={z.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: z.color }} />
              <Text style={{ color: C.ink2, fontSize: 11, flex: 1 }}>
                {z.label} <Text style={{ color: C.ink3, fontSize: 10 }}>{z.range}</Text>
              </Text>
              <Text style={{ color: C.ink1, fontSize: 11, fontFamily: "monospace" }}>
                {z.pct}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </DarkCard>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function Heatmap({ heatmap, chartWidth }: { heatmap: number[]; chartWidth: number }) {
  const cellSize = Math.floor((chartWidth - 32) / 12);

  return (
    <DarkCard>
      <Label text="Nhịp tim theo giờ (24h)" />
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {heatmap.slice(0, 12).map((bpm, h) => (
            <View
              key={h}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: 5,
                backgroundColor: bpmToHeatColor(bpm),
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {heatmap.slice(12, 24).map((bpm, h) => (
            <View
              key={h + 12}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: 5,
                backgroundColor: bpmToHeatColor(bpm),
              }}
            />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        {["00", "04", "08", "12", "16", "20"].map((h) => (
          <Text key={h} style={{ color: C.ink3, fontSize: 10, fontFamily: "monospace" }}>
            {h}
          </Text>
        ))}
      </View>
    </DarkCard>
  );
}

// ─── Stress Card ─────────────────────────────────────────────────────────────

function StressCard({ stress, chartWidth }: { stress: number; chartWidth: number }) {
  const score = Math.max(0, Math.min(100, stress));
  const statusInfo = (() => {
    if (score < 30) return { label: "Calm", color: C.green };
    if (score < 55) return { label: "Balanced", color: C.yellow };
    if (score < 75) return { label: "Tense", color: C.orange };
    return { label: "High", color: C.hr };
  })();

  const barW = chartWidth - 32;

  return (
    <DarkCard>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Label text="Phân tích stress" />
        <View
          style={{
            backgroundColor: `${statusInfo.color}22`,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: `${statusInfo.color}44`,
          }}
        >
          <Text style={{ color: statusInfo.color, fontSize: 11, fontWeight: "700" }}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginBottom: 16 }}>
        <Text style={{ color: C.ink0, fontSize: 44, fontWeight: "700", lineHeight: 48 }}>
          {score}
        </Text>
        <Text style={{ color: C.ink3, fontSize: 16, marginBottom: 8 }}>/100</Text>
      </View>

      <View style={{ marginBottom: 8, gap: 6 }}>
        <View style={{ position: "relative" }}>
          <Svg width={barW} height={10} style={{ borderRadius: 5, overflow: "hidden" }}>
            <Defs>
              <LinearGradient id="stressBarGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={C.green} />
                <Stop offset="45%" stopColor={C.yellow} />
                <Stop offset="70%" stopColor={C.orange} />
                <Stop offset="100%" stopColor={C.hr} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={barW} height={10} rx={5} fill={C.bg2} />
            <Rect x={0} y={0} width={barW * (score / 100)} height={10} rx={5} fill="url(#stressBarGrad)" />
          </Svg>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: Math.max(0, Math.min(barW - 12, barW * (score / 100) - 6)),
              width: 12,
              height: 10,
              backgroundColor: "white",
              borderRadius: 6,
            }}
          />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {["Calm", "Balanced", "Tense", "High"].map((t) => (
            <Text key={t} style={{ color: C.ink3, fontSize: 10, fontFamily: "monospace" }}>
              {t}
            </Text>
          ))}
        </View>
      </View>
    </DarkCard>
  );
}

// ─── Weekly Bars ─────────────────────────────────────────────────────────────

function WeeklyBars({
  daily,
  chartWidth,
}: {
  daily: HealthDailySummary[];
  chartWidth: number;
}) {
  const items = useMemo(() => [...daily].reverse().slice(0, 7), [daily]);

  if (items.length === 0) {
    return (
      <DarkCard>
        <Label text="Xu hướng 7 ngày" />
        <View style={{ height: 90, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.ink3, fontSize: 12 }}>Chưa có dữ liệu</Text>
        </View>
      </DarkCard>
    );
  }

  const maxAvg = Math.max(...items.map((d) => d.avg_hr ?? 0), 1);
  const barMaxH = 70;
  const barW = 22;
  const svgW = chartWidth - 32;
  const svgH = barMaxH + 28;
  const gap = (svgW - barW * items.length) / Math.max(items.length - 1, 1);

  return (
    <DarkCard>
      <Label text="Xu hướng 7 ngày" />
      <Svg width={svgW} height={svgH}>
        <Defs>
          {items.map((_, i) => {
            const isToday = i === items.length - 1;
            return (
              <LinearGradient key={i} id={`bar${i}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={isToday ? "white" : C.hr} />
                <Stop offset="100%" stopColor={isToday ? C.hr : "rgba(255,59,92,0.3)"} />
              </LinearGradient>
            );
          })}
        </Defs>
        {items.map((d, i) => {
          const avg = d.avg_hr ?? 0;
          const bh = avg > 0 ? (avg / maxAvg) * barMaxH : 2;
          const x = i * (barW + gap);
          const y = barMaxH - bh;
          return (
            <G key={d.date}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={bh}
                rx={6}
                ry={6}
                fill={`url(#bar${i})`}
              />
              <SvgText
                x={x + barW / 2}
                y={svgH - 4}
                fontSize={10}
                fill={C.ink3}
                textAnchor="middle"
                fontFamily="monospace"
              >
                {d.date.slice(5)}
              </SvgText>
              {avg > 0 && (
                <SvgText
                  x={x + barW / 2}
                  y={y - 4}
                  fontSize={9}
                  fill={C.ink2}
                  textAnchor="middle"
                >
                  {Math.round(avg)}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </DarkCard>
  );
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

type HealthTab = "hr" | "steps" | "map";

const TAB_CONFIG: { key: HealthTab; label: string; activeColor: string; activeBorder: string }[] = [
  { key: "hr",    label: "❤️  Nhịp tim",  activeColor: "#FF3B5C", activeBorder: "rgba(255,59,92,0.35)" },
  { key: "steps", label: "👣  Bước chân", activeColor: "#4ADE80", activeBorder: "rgba(74,222,128,0.35)" },
  { key: "map",   label: "📍  Bản đồ",    activeColor: "#5BB4FF", activeBorder: "rgba(91,180,255,0.35)" },
];

function HealthTabBar({
  active,
  onChange,
}: {
  active: HealthTab;
  onChange: (t: HealthTab) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: C.bg2,
        borderRadius: 14,
        padding: 3,
        borderWidth: 1,
        borderColor: C.line,
      }}
    >
      {TAB_CONFIG.map(({ key, label, activeColor, activeBorder }) => {
        const on = active === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 11,
              alignItems: "center",
              backgroundColor: on ? C.bg1 : "transparent",
              borderWidth: on ? 1 : 0,
              borderColor: on ? activeBorder : "transparent",
            }}
          >
            <Text style={{ color: on ? activeColor : C.ink3, fontSize: 11, fontWeight: "700", letterSpacing: 0.2 }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Steps helpers ────────────────────────────────────────────────────────────

interface DailySteps {
  date: string;
  total: number;    // steps for that day
  kcal: number;
}

// Hours when watch is typically not worn — exclude from step calculations
function isActiveHour(ts: number): boolean {
  const h = new Date(ts * 1000).getHours();
  return h >= 7 && h < 20;
}

function computeDailyStepsFromHistory(historyAsc: HealthSyncRecord[]): DailySteps[] {
  const byDate: Record<string, HealthSyncRecord[]> = {};
  for (const r of historyAsc) {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, recs]) => {
      // steps is cumulative (resets at midnight). Strategy:
      // 1. Take only active-hour records (7–20h) — watch is worn
      // 2. Find the reset (steps→0), use records after it
      // 3. Total = max cumulative value after reset = steps at ~20h
      const activeRecs = recs.filter((r) => isActiveHour(r.ts));

      // Find the last zero (midnight reset leaked into active window)
      let lastZeroIdx = -1;
      for (let i = 0; i < activeRecs.length; i++) {
        if (activeRecs[i].steps === 0) lastZeroIdx = i;
      }
      const relevant = activeRecs.slice(lastZeroIdx + 1);

      // Highest cumulative value seen = total steps for the day at last wear
      const total = relevant.length ? Math.max(...relevant.map((r) => r.steps)) : 0;
      const kcal = Math.max(...recs.map((r) => r.calories), 0);
      return { date, total, kcal };
    });
}

function arcPath(
  cx: number, cy: number, r: number,
  startDeg: number, endDeg: number,
): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const sx = cx + r * Math.cos(rad(startDeg));
  const sy = cy + r * Math.sin(rad(startDeg));
  const ex = cx + r * Math.cos(rad(endDeg));
  const ey = cy + r * Math.sin(rad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${sx.toFixed(2)},${sy.toFixed(2)} A${r},${r},0,${large},1,${ex.toFixed(2)},${ey.toFixed(2)}`;
}

function fmtSteps(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("vi-VN");
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return days[d.getDay()];
}

function computeHourlySteps(records: HealthSyncRecord[]): number[] {
  // Only active hours (7–20), find reset, compute per-hour increments
  const activeRecs = records.filter((r) => isActiveHour(r.ts));
  let lastZeroIdx = -1;
  for (let i = 0; i < activeRecs.length; i++) {
    if (activeRecs[i].steps === 0) lastZeroIdx = i;
  }
  const recs = activeRecs.slice(lastZeroIdx + 1);

  const maxByHour: (number | null)[] = new Array(24).fill(null);
  for (const r of recs) {
    const h = new Date(r.ts * 1000).getHours();
    if (maxByHour[h] === null || r.steps > maxByHour[h]!) maxByHour[h] = r.steps;
  }
  const hourly = new Array(24).fill(0);
  let prev = 0;
  for (let h = 0; h < 24; h++) {
    if (maxByHour[h] !== null) {
      hourly[h] = Math.max(0, maxByHour[h]! - prev);
      prev = maxByHour[h]!;
    }
  }
  return hourly;
}

// ─── Steps Hero Card ──────────────────────────────────────────────────────────

function StepsHeroCard({ stepsData }: { stepsData: DailySteps[] }) {
  const today = stepsData[stepsData.length - 1];
  const steps = today?.total ?? 0;
  const goal = 10000;
  const pct = Math.min(1, steps / goal);
  const kcal = today?.kcal > 0 ? today.kcal : Math.round(steps * 0.04);
  const km = (steps * 0.00075).toFixed(1);

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 62;
  const startDeg = 135;
  const totalArc = 270;
  const endDeg = startDeg + totalArc * pct;

  const bgArc = arcPath(cx, cy, r, startDeg, startDeg + totalArc);
  const fgArc = pct > 0.002 ? arcPath(cx, cy, r, startDeg, endDeg) : null;

  return (
    <DarkCard style={{ borderColor: "rgba(74,222,128,0.18)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
        <Text style={{ color: C.green, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
          HÔM NAY
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        {/* Progress ring */}
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="stepRingGrad" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0%" stopColor="#22D3EE" />
                <Stop offset="100%" stopColor="#4ADE80" />
              </LinearGradient>
            </Defs>
            <Path d={bgArc} stroke="rgba(255,255,255,0.07)" strokeWidth={13} fill="none" strokeLinecap="round" />
            {fgArc && (
              <Path d={fgArc} stroke="url(#stepRingGrad)" strokeWidth={13} fill="none" strokeLinecap="round" />
            )}
          </Svg>
          <View style={{ position: "absolute", alignItems: "center" }}>
            <Text style={{ color: C.ink0, fontSize: 28, fontWeight: "700", fontFamily: "monospace", lineHeight: 32 }}>
              {fmtSteps(steps)}
            </Text>
            <Text style={{ color: C.green, fontSize: 10, fontWeight: "600", marginTop: 2 }}>
              {Math.round(pct * 100)}%
            </Text>
            <Text style={{ color: C.ink3, fontSize: 9, marginTop: 1 }}>/ 10k mục tiêu</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flex: 1, gap: 20 }}>
          <View>
            <Text style={{ color: C.ink3, fontSize: 10, fontWeight: "600", letterSpacing: 0.5 }}>CALORIES</Text>
            <Text style={{ color: C.orange, fontSize: 22, fontWeight: "700", fontFamily: "monospace", marginTop: 2 }}>
              {kcal}
            </Text>
            <Text style={{ color: C.ink3, fontSize: 10 }}>kcal</Text>
          </View>
          <View>
            <Text style={{ color: C.ink3, fontSize: 10, fontWeight: "600", letterSpacing: 0.5 }}>QUÃNG ĐƯỜNG</Text>
            <Text style={{ color: C.blue, fontSize: 22, fontWeight: "700", fontFamily: "monospace", marginTop: 2 }}>
              {km}
            </Text>
            <Text style={{ color: C.ink3, fontSize: 10 }}>km</Text>
          </View>
        </View>
      </View>

      {/* Goal bar */}
      <View style={{ marginTop: 16, gap: 5 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: C.ink3, fontSize: 10 }}>Mục tiêu 10,000 bước</Text>
          <Text style={{ color: steps >= goal ? C.green : C.ink2, fontSize: 10, fontWeight: "600" }}>
            {steps >= goal ? "Hoàn thành 🎉" : `còn ${(goal - steps).toLocaleString("vi-VN")} bước`}
          </Text>
        </View>
        <View style={{ height: 4, backgroundColor: C.line, borderRadius: 2, overflow: "hidden" }}>
          <View style={{ height: 4, width: `${Math.round(pct * 100)}%` as any, backgroundColor: C.green, borderRadius: 2 }} />
        </View>
      </View>
    </DarkCard>
  );
}

// ─── Steps Day Detail Modal ───────────────────────────────────────────────────

function StepsDayDetail({
  day,
  historyAsc,
  chartWidth,
  onClose,
}: {
  day: DailySteps;
  historyAsc: HealthSyncRecord[];
  chartWidth: number;
  onClose: () => void;
}) {
  const dayRecords = historyAsc.filter((r) => r.date === day.date);
  const hourly = computeHourlySteps(dayRecords);
  const maxH = Math.max(...hourly, 1);
  const steps = day.total;

  const svgW = chartWidth - 32;
  const svgH = 120;
  const barW = Math.floor((svgW - 46) / 24);
  const gap = (svgW - 46 - barW * 24) / 23;

  const labelHours = [0, 6, 12, 18, 23];

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              backgroundColor: C.bg1,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: 32,
              borderTopWidth: 1,
              borderColor: C.line,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <View>
                <Text style={{ color: C.ink0, fontSize: 16, fontWeight: "700" }}>
                  {dayLabel(day.date)} · {day.date.slice(5).replace("-", "/")}
                </Text>
                <Text style={{ color: C.green, fontSize: 24, fontWeight: "700", fontFamily: "monospace", marginTop: 4 }}>
                  {fmtSteps(steps)} <Text style={{ color: C.ink3, fontSize: 12, fontWeight: "400" }}>bước</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: C.glass2, alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ color: C.ink2, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Hourly chart */}
            <Text style={{ color: C.ink3, fontSize: 11, marginBottom: 8 }}>Số bước theo giờ</Text>
            <Svg width={svgW} height={svgH + 18}>
              <Defs>
                <LinearGradient id="hourBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#4ADE80" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#22D3EE" stopOpacity="0.6" />
                </LinearGradient>
              </Defs>
              {hourly.map((v, h) => {
                const bh = v > 0 ? Math.max(3, (v / maxH) * svgH) : 2;
                const x = 23 + h * (barW + gap);
                const y = svgH - bh;
                return (
                  <G key={h}>
                    <Rect
                      x={x} y={y} width={barW} height={bh}
                      rx={2} ry={2}
                      fill={v > 0 ? "url(#hourBarGrad)" : "rgba(255,255,255,0.04)"}
                    />
                  </G>
                );
              })}
              {/* Y label */}
              {[0, Math.round(maxH / 2), maxH].map((v, i) => (
                <SvgText
                  key={i}
                  x={20} y={svgH - (v / maxH) * svgH + 4}
                  fontSize={8} fill={C.ink3} textAnchor="end"
                >
                  {v > 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                </SvgText>
              ))}
              {/* X labels */}
              {labelHours.map((h) => (
                <SvgText
                  key={h}
                  x={23 + h * (barW + gap) + barW / 2}
                  y={svgH + 14}
                  fontSize={9} fill={C.ink3} textAnchor="middle"
                >
                  {`${h}h`}
                </SvgText>
              ))}
            </Svg>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Steps Weekly Chart ───────────────────────────────────────────────────────

function StepsWeeklyChart({
  stepsData,
  historyAsc,
  chartWidth,
}: {
  stepsData: DailySteps[];
  historyAsc: HealthSyncRecord[];
  chartWidth: number;
}) {
  const [selectedDay, setSelectedDay] = useState<DailySteps | null>(null);

  const items = stepsData;
  if (!items.length) {
    return (
      <DarkCard>
        <Label text="Lịch sử 7 ngày" />
        <Text style={{ color: C.ink3, fontSize: 12 }}>Chưa có dữ liệu</Text>
      </DarkCard>
    );
  }

  const maxSteps = Math.max(...items.map((d) => d.total), 1);
  const barMaxH = 80;
  const svgW = chartWidth - 32;
  const svgH = barMaxH + 48;
  const barW = Math.floor((svgW - 8) / items.length) - 6;
  const spacing = (svgW - barW * items.length) / Math.max(items.length - 1, 1);
  const todayDate = items[items.length - 1]?.date;

  return (
    <>
      <DarkCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Label text="Lịch sử 7 ngày" />
          <Text style={{ color: C.ink3, fontSize: 10 }}>Nhấn để xem chi tiết</Text>
        </View>
        <Svg width={svgW} height={svgH}>
          <Defs>
            {items.map((_, i) => {
              const isToday = items[i].date === todayDate;
              return (
                <LinearGradient key={i} id={`stepBar${i}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={isToday ? "#4ADE80" : "#22D3EE"} />
                  <Stop offset="100%" stopColor={isToday ? "rgba(74,222,128,0.25)" : "rgba(34,211,238,0.2)"} />
                </LinearGradient>
              );
            })}
          </Defs>
          {items.map((d, i) => {
            const s = d.total;
            const bh = s > 0 ? Math.max(4, (s / maxSteps) * barMaxH) : 4;
            const x = i * (barW + spacing);
            const y = barMaxH - bh;
            const isToday = d.date === todayDate;
            return (
              <G
                key={d.date}
                onPress={() => setSelectedDay(d)}
              >
                {/* Tap target */}
                <Rect x={x} y={0} width={barW} height={svgH} fill="transparent" />
                {/* Bar */}
                <Rect x={x} y={y} width={barW} height={bh} rx={5} ry={5} fill={`url(#stepBar${i})`} />
                {/* Day label */}
                <SvgText
                  x={x + barW / 2} y={barMaxH + 14}
                  fontSize={10} fill={isToday ? C.green : C.ink3}
                  textAnchor="middle" fontFamily="monospace" fontWeight={isToday ? "700" : "400"}
                >
                  {dayLabel(d.date)}
                </SvgText>
                {/* Step count */}
                {s > 0 && (
                  <SvgText
                    x={x + barW / 2} y={y - 4}
                    fontSize={9} fill={isToday ? C.green : C.ink2}
                    textAnchor="middle"
                  >
                    {fmtSteps(s)}
                  </SvgText>
                )}
                {/* Goal line indicator dot */}
                {isToday && (
                  <Rect x={x} y={barMaxH - (10000 / maxSteps) * barMaxH} width={barW} height={1}
                    fill="rgba(74,222,128,0.3)" />
                )}
              </G>
            );
          })}
          {/* Goal dashed line */}
          <SvgLine
            x1={0} y1={barMaxH - (Math.min(1, 10000 / maxSteps)) * barMaxH}
            x2={svgW} y2={barMaxH - (Math.min(1, 10000 / maxSteps)) * barMaxH}
            stroke="rgba(74,222,128,0.2)" strokeWidth={1} strokeDasharray="4,4"
          />
          <SvgText
            x={svgW - 2} y={barMaxH - (Math.min(1, 10000 / maxSteps)) * barMaxH - 3}
            fontSize={8} fill="rgba(74,222,128,0.5)" textAnchor="end"
          >
            10k
          </SvgText>
        </Svg>
      </DarkCard>

      {selectedDay && (
        <StepsDayDetail
          day={selectedDay}
          historyAsc={historyAsc}
          chartWidth={chartWidth}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}

// ─── Steps Dashboard ──────────────────────────────────────────────────────────

function StepsDashboard({
  historyAsc,
  chartWidth,
}: {
  historyAsc: HealthSyncRecord[];
  chartWidth: number;
}) {
  const stepsData = useMemo(() => computeDailyStepsFromHistory(historyAsc), [historyAsc]);
  return (
    <>
      <StepsHeroCard stepsData={stepsData} />
      <StepsWeeklyChart stepsData={stepsData} historyAsc={historyAsc} chartWidth={chartWidth} />
    </>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function Health() {
  const { width } = useWindowDimensions();
  const chartWidth = width - 32;
  const [range, setRange] = useState<Range>("24H");
  const [activeTab, setActiveTab] = useState<HealthTab>("hr");
  const user = useAuthStore((s) => s.user);

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

  const { data: daily = [] } = useQuery({
    queryKey: ["health-daily", device],
    queryFn: () => fetchHealthDaily(device!, 7),
    enabled: !!device,
  });

  const historyAsc = useMemo(() => [...historyDesc].reverse(), [historyDesc]);

  const filtered = useMemo(() => {
    if (range === "7D") return historyAsc;
    return filterSeries(historyAsc, range);
  }, [historyAsc, range]);

  const kpis = useMemo(() => computeKpis(filtered, daily[0]), [filtered, daily]);
  const zones = useMemo(() => computeZones(filtered), [filtered]);
  const heatmap = useMemo(() => computeHeatmap(historyAsc), [historyAsc]);

  const sparkData = historyAsc.slice(-20);
  const sparkHr = historyAsc.slice(-12).map((r) => r.hr);

  const latest = historyDesc[0];
  const liveBpm = latest?.hr ?? 0;

  const [liveTime, setLiveTime] = useState(nowHM());
  useEffect(() => {
    const id = setInterval(() => setLiveTime(nowHM()), 30000);
    return () => clearInterval(id);
  }, []);

  if (loadingDevices || (!!device && loadingHistory)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg0, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.hr} size="large" />
        <Text style={{ color: C.ink3, fontSize: 12, marginTop: 12 }}>Đang tải dữ liệu sức khỏe…</Text>
      </SafeAreaView>
    );
  }

  if (devError || !device) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: C.bg0, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 }}
      >
        <Text style={{ fontSize: 32 }}>⌚</Text>
        <Text style={{ color: C.ink0, fontSize: 15, fontWeight: "700", textAlign: "center" }}>
          Chưa có dữ liệu từ đồng hồ
        </Text>
        <Text style={{ color: C.ink3, fontSize: 13, textAlign: "center" }}>
          Đảm bảo đồng hồ Garmin đã cài app HanoiWatch và đã đồng bộ ít nhất một lần.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg0 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={{ color: C.ink0, fontSize: 22, fontWeight: "700" }}>Sức khoẻ</Text>
            <Text style={{ color: C.ink2, fontSize: 12, marginTop: 2 }}>{device}</Text>
          </View>
          <Text style={{ color: C.ink2, fontSize: 12, fontFamily: "monospace", marginTop: 4 }}>
            {liveTime}
          </Text>
        </View>

        {/* Tab Bar */}
        <HealthTabBar active={activeTab} onChange={setActiveTab} />

        {activeTab === "hr" ? (
          <>
            {/* Hero BPM */}
            <HeroBpmCard
              bpm={liveBpm}
              sparkData={sparkData}
              device={device}
              chartWidth={chartWidth}
            />

            {/* Range Pills */}
            <RangePills value={range} onChange={setRange} />

            {/* HR Area Chart */}
            <DarkCard style={{ padding: 12 }}>
              <Label text="Nhịp tim" />
              <HRAreaChart
                series={filtered}
                daily={daily}
                range={range}
                chartWidth={chartWidth - 24}
              />
            </DarkCard>

            {/* KPI Grid */}
            <KpiGrid kpis={kpis} sparkHr={sparkHr} />

            {/* Zone Donut */}
            <ZoneDonut zones={zones} range={range} series={filtered} />

            {/* Heatmap */}
            <Heatmap heatmap={heatmap} chartWidth={chartWidth} />

            {/* Stress */}
            <StressCard stress={kpis.stress} chartWidth={chartWidth} />

            {/* Weekly Bars */}
            <WeeklyBars daily={daily} chartWidth={chartWidth} />
          </>
        ) : activeTab === "map" ? (
          <HealthMap records={historyAsc} height={420} />
        ) : (
          <StepsDashboard
            historyAsc={historyAsc}
            chartWidth={chartWidth}
          />
        )}

        {/* Footer */}
        <View style={{ alignItems: "center", paddingBottom: 8 }}>
          <Text style={{ color: C.ink3, fontSize: 10, fontFamily: "monospace" }}>
            Đồng bộ mỗi 5 phút
            {latest?.created_at
              ? ` · cập nhật ${new Date(latest.created_at + "Z").toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
