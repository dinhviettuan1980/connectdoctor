import { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Linking } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import MapView, { Polyline, Circle, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import type { LocationPoint } from "@/lib/locationApi";

interface HomeAddress { label: string; lat: number; lng: number }

interface Props {
  points: LocationPoint[];
  height?: number;
  homeAddress?: HomeAddress;
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
            width: 20, height: 20, borderRadius: 10,
            backgroundColor: "rgba(255,59,92,0.35)",
            borderWidth: 1.5, borderColor: "rgba(255,59,92,0.6)",
          },
          ringStyle,
        ]}
      />
      <View
        style={{
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: "#FF3B5C",
          borderWidth: 2, borderColor: "white",
          shadowColor: "#FF3B5C", shadowOpacity: 0.8, shadowRadius: 4,
        }}
      />
    </View>
  );
}

export default function HealthMap({ points, height = 300, homeAddress }: Props) {
  const [livePos, setLivePos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locLoading, setLocLoading] = useState(true);
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const { status: s2 } = await Location.requestForegroundPermissionsAsync();
        if (s2 !== "granted") { setLocLoading(false); return; }
      }
      // Use cached last-known position instantly (no GPS hardware wait)
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setLivePos({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        setLocLoading(false);
      }
      // Refine with fresh coarse fix (WiFi/cell, ~0.5 s) in background
      const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
      setLivePos({ latitude: fresh.coords.latitude, longitude: fresh.coords.longitude });
      if (!last) setLocLoading(false);
    }
    init().catch(() => setLocLoading(false));
  }, []);

  const goHome = async () => {
    if (!homeAddress || !livePos) return;
    setRouteLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${livePos.longitude},${livePos.latitude};${homeAddress.lng},${homeAddress.lat}?overview=full&geometries=geojson`;
      const data = await (await fetch(url)).json();
      const coords = data.routes?.[0]?.geometry?.coordinates;
      if (coords) {
        setRoute(coords.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })));
      }
    } catch { } finally {
      setRouteLoading(false);
    }
  };

  const { coords, clusters, region, currentPos } = useMemo(() => {
    const hasHistory = points.length > 0;

    const lats = hasHistory ? points.map((p) => p.lat) : livePos ? [livePos.latitude] : [];
    const lngs = hasHistory ? points.map((p) => p.lng) : livePos ? [livePos.longitude] : [];

    if (!lats.length) return { coords: [], clusters: [], region: null, currentPos: livePos };

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const pad = 0.003;

    const sorted = hasHistory ? [...points].sort((a, b) => b.ts - a.ts) : null;
    const cur = livePos ?? (sorted ? { latitude: sorted[0].lat, longitude: sorted[0].lng } : null);

    return {
      coords: hasHistory ? points : [],
      clusters: hasHistory ? clusterPoints(points) : [],
      currentPos: cur,
      region: {
        latitude: cur?.latitude ?? (minLat + maxLat) / 2,
        longitude: cur?.longitude ?? (minLng + maxLng) / 2,
        latitudeDelta: Math.max(maxLat - minLat + pad, 0.008),
        longitudeDelta: Math.max(maxLng - minLng + pad, 0.008),
      },
    };
  }, [points, livePos]);

  if (locLoading) {
    return (
      <View style={{ height, borderRadius: 16, backgroundColor: "#0E1016", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
        <ActivityIndicator color="#4ADE80" />
        <Text style={{ color: "#5A5E6B", fontSize: 12, marginTop: 8 }}>Đang lấy vị trí…</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={{ height, borderRadius: 16, backgroundColor: "#0E1016", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
        <Text style={{ fontSize: 28 }}>📍</Text>
        <Text style={{ color: "#F4F5F8", fontSize: 14, fontWeight: "700" }}>Không lấy được vị trí</Text>
        <Text style={{ color: "#5A5E6B", fontSize: 12, textAlign: "center", paddingHorizontal: 24 }}>
          Vui lòng cấp quyền vị trí cho ConnectDoctor
        </Text>
      </View>
    );
  }

  const maxCount = clusters.length ? Math.max(...clusters.map((c) => c.count), 1) : 1;

  return (
    <View style={{ borderRadius: 16, overflow: "hidden" }}>
      <MapView
        style={{ height, borderRadius: 16, overflow: "hidden" }}
        provider={PROVIDER_DEFAULT}
        region={region}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {coords.length >= 2 && (
          <Polyline
            coordinates={coords.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor="#4ADE80"
            strokeWidth={3}
          />
        )}

        {route && route.length >= 2 && (
          <Polyline
            coordinates={route}
            strokeColor="#5BB4FF"
            strokeWidth={5}
            lineDashPattern={[10, 6]}
          />
        )}

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

        {homeAddress && (
          <Marker
            coordinate={{ latitude: homeAddress.lat, longitude: homeAddress.lng }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <Text style={{ fontSize: 22 }}>🏠</Text>
          </Marker>
        )}

        {currentPos && (
          <Marker coordinate={currentPos} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <PulsingDot />
          </Marker>
        )}
      </MapView>

      {homeAddress && (
        <View style={{ flexDirection: "row", gap: 8, padding: 10, backgroundColor: "#0E1016", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
          <Pressable
            onPress={route ? () => setRoute(null) : goHome}
            disabled={routeLoading}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: route ? "rgba(91,180,255,0.15)" : "rgba(255,255,255,0.06)", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: route ? "rgba(91,180,255,0.4)" : "rgba(255,255,255,0.12)" }}
          >
            {routeLoading
              ? <ActivityIndicator size="small" color="#5BB4FF" />
              : <Text style={{ fontSize: 14 }}>{route ? "✕" : "🏠"}</Text>
            }
            <Text style={{ color: route ? "#5BB4FF" : "#C7CAD3", fontSize: 12, fontWeight: "700" }}>
              {routeLoading ? "Đang tính…" : route ? "Xoá đường đi" : "Về nhà"}
            </Text>
          </Pressable>
          {route && (
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={{ color: "#5A5E6B", fontSize: 11 }} numberOfLines={1}>→ {homeAddress.label}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
