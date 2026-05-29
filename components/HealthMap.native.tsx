import { useEffect, useMemo } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import MapView, { Polyline, Circle, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import type { LocationPoint } from "@/lib/locationApi";

interface Props {
  points: LocationPoint[];
  height?: number;
}

function distanceM(a: LocationPoint, b: LocationPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function clusterPoints(pts: LocationPoint[]): { latitude: number; longitude: number; count: number }[] {
  const clusters: { latitude: number; longitude: number; count: number }[] = [];
  const used = new Set<number>();
  for (let i = 0; i < pts.length; i++) {
    if (used.has(i)) continue;
    const members = [pts[i]];
    used.add(i);
    for (let j = i + 1; j < pts.length; j++) {
      if (!used.has(j) && distanceM(pts[i], pts[j]) <= 40) {
        members.push(pts[j]);
        used.add(j);
      }
    }
    clusters.push({
      latitude: members.reduce((s, p) => s + p.lat, 0) / members.length,
      longitude: members.reduce((s, p) => s + p.lng, 0) / members.length,
      count: members.length,
    });
  }
  return clusters;
}

function PulsingDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(2.2, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 900 }), withTiming(0.6, { duration: 900 })),
      -1,
      false,
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: "rgba(255,59,92,0.35)",
            borderWidth: 1.5,
            borderColor: "rgba(255,59,92,0.6)",
          },
          ringStyle,
        ]}
      />
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: "#FF3B5C",
          borderWidth: 2,
          borderColor: "white",
          shadowColor: "#FF3B5C",
          shadowOpacity: 0.8,
          shadowRadius: 4,
        }}
      />
    </View>
  );
}

export default function HealthMap({ points, height = 300 }: Props) {
  const { coords, clusters, region, currentPos } = useMemo(() => {
    if (!points.length) return { coords: [], clusters: [], region: null, currentPos: null };

    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const pad = 0.002;

    const sorted = [...points].sort((a, b) => b.ts - a.ts);

    return {
      coords: points,
      clusters: clusterPoints(points),
      currentPos: { latitude: sorted[0].lat, longitude: sorted[0].lng },
      region: {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(maxLat - minLat + pad, 0.005),
        longitudeDelta: Math.max(maxLng - minLng + pad, 0.005),
      },
    };
  }, [points]);

  if (!coords.length) {
    return (
      <View
        style={{
          height,
          borderRadius: 16,
          backgroundColor: "#0E1016",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <Text style={{ fontSize: 28 }}>📍</Text>
        <Text style={{ color: "#F4F5F8", fontSize: 14, fontWeight: "700" }}>Chưa có dữ liệu GPS</Text>
        <Text style={{ color: "#5A5E6B", fontSize: 12, textAlign: "center", paddingHorizontal: 24 }}>
          Vị trí sẽ tự động ghi khi bạn di chuyển
        </Text>
      </View>
    );
  }

  const maxCount = Math.max(...clusters.map((c) => c.count), 1);

  return (
    <MapView
      style={{ height, borderRadius: 16, overflow: "hidden" }}
      provider={PROVIDER_DEFAULT}
      region={region!}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <Polyline
        coordinates={coords.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
        strokeColor="#4ADE80"
        strokeWidth={3}
      />

      {clusters.map((c, i) => {
        const t = c.count / maxCount;
        return (
          <Circle
            key={i}
            center={{ latitude: c.latitude, longitude: c.longitude }}
            radius={15 + t * 60}
            fillColor={`rgba(74,222,128,${(0.15 + t * 0.55).toFixed(2)})`}
            strokeColor={`rgba(74,222,128,${Math.min(1, 0.35 + t * 0.55).toFixed(2)})`}
            strokeWidth={1}
          />
        );
      })}

      {currentPos && (
        <Marker coordinate={currentPos} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <PulsingDot />
        </Marker>
      )}
    </MapView>
  );
}
