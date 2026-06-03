import { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";
import type { LocationPoint } from "@/lib/locationApi";

export interface MemberStream {
  uid: string;
  name: string;
  color: string;
  points: LocationPoint[];
}

interface Props {
  streams: MemberStream[];
  height?: number;
  loading?: boolean;
}

export default function FamilyMap({ streams, height = 360, loading }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const region = useMemo<Region | null>(() => {
    const all: { lat: number; lng: number }[] = [];
    for (const s of streams) {
      for (const p of s.points) all.push({ lat: p.lat, lng: p.lng });
    }
    if (all.length === 0) return null;
    const lats = all.map((p) => p.lat);
    const lngs = all.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat + 0.008, 0.012),
      longitudeDelta: Math.max(maxLng - minLng + 0.008, 0.012),
    };
  }, [streams]);

  if (loading || !ready) {
    return (
      <View style={{ height, borderRadius: 16, backgroundColor: "#0E1016", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#4ADE80" />
        <Text style={{ color: "#5A5E6B", fontSize: 12, marginTop: 8 }}>Đang tải tracking…</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={{ height, borderRadius: 16, backgroundColor: "#0E1016", alignItems: "center", justifyContent: "center", gap: 8, padding: 24 }}>
        <Text style={{ fontSize: 28 }}>📍</Text>
        <Text style={{ color: "#F4F5F8", fontSize: 14, fontWeight: "700" }}>Chưa có dữ liệu tracking</Text>
        <Text style={{ color: "#5A5E6B", fontSize: 12, textAlign: "center" }}>
          Các thành viên trong nhóm chưa di chuyển hoặc chưa cho phép chia sẻ vị trí.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 16, overflow: "hidden" }}>
      <MapView
        style={{ height }}
        provider={PROVIDER_DEFAULT}
        region={region}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {streams.map((s) => {
          const coords = s.points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
          const latest = s.points[s.points.length - 1];
          return (
            <View key={s.uid}>
              {coords.length >= 2 && (
                <Polyline coordinates={coords} strokeColor={s.color} strokeWidth={3} />
              )}
              {latest && (
                <Marker
                  coordinate={{ latitude: latest.lat, longitude: latest.lng }}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={{ alignItems: "center" }}>
                    <View style={{ backgroundColor: s.color, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1.5, borderColor: "white" }}>
                      <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>{s.name}</Text>
                    </View>
                    <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: s.color }} />
                  </View>
                </Marker>
              )}
            </View>
          );
        })}
      </MapView>
    </View>
  );
}
