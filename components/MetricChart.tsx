import Svg, { Polyline } from "react-native-svg";
import { View, Text } from "react-native";
import { colors } from "@/lib/theme";

interface MetricChartProps {
  systolic?: number[];
  diastolic?: number[];
  height?: number;
}

// Tiny BP/HR trend chart. Pass arrays of numbers (one point per measurement).
// If only one series is given, hides the dashed line.
export function MetricChart({ systolic, diastolic, height = 110 }: MetricChartProps) {
  const w = 200;
  const h = 100;
  const toPoints = (arr: number[], min = 60, max = 160) =>
    arr
      .map((v, i) => {
        const x = (i / Math.max(1, arr.length - 1)) * w;
        const y = h - ((v - min) / (max - min)) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <View className="border border-line bg-paper rounded-lg overflow-hidden" style={{ height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {systolic && (
          <Polyline
            points={toPoints(systolic)}
            fill="none"
            stroke={colors.accentInk}
            strokeWidth="1.5"
          />
        )}
        {diastolic && (
          <Polyline
            points={toPoints(diastolic)}
            fill="none"
            stroke={colors.ink3}
            strokeWidth="1.25"
            strokeDasharray="3 3"
          />
        )}
      </Svg>
    </View>
  );
}
