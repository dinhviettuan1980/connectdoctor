import { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import type { LocationPoint } from "@/lib/locationApi";
import { fetchRouteWithSteps, stepsToVietnamese, speakVi, stopSpeaking } from "@/lib/voiceNav";

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

function clusterPoints(pts: LocationPoint[]): { lat: number; lng: number; count: number }[] {
  const clusters: { lat: number; lng: number; count: number }[] = [];
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
      lat: members.reduce((s, p) => s + p.lat, 0) / members.length,
      lng: members.reduce((s, p) => s + p.lng, 0) / members.length,
      count: members.length,
    });
  }
  return clusters;
}

function buildLeafletHTML(
  points: LocationPoint[],
  clusters: { lat: number; lng: number; count: number }[],
  currentPos: [number, number],
  homeAddress?: HomeAddress,
  route?: [number, number][],
): string {
  const maxCount = Math.max(...clusters.map((c) => c.count), 1);

  const clusterJS = clusters
    .map((c) => {
      const t = c.count / maxCount;
      const radius = 15 + t * 60;
      const opacity = 0.15 + t * 0.55;
      return `L.circle([${c.lat},${c.lng}],{radius:${radius.toFixed(1)},color:'rgba(74,222,128,${Math.min(1, opacity + 0.2).toFixed(2)})',fillColor:'rgba(74,222,128,${opacity.toFixed(2)})',fillOpacity:1,weight:1}).addTo(map);`;
    })
    .join("\n");

  const latlngsJS = `[${points.map((p) => `[${p.lat},${p.lng}]`).join(",")}]`;

  const homeJS = homeAddress
    ? `var homeIcon=L.divIcon({html:'<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))">🏠</div>',className:'',iconSize:[24,24],iconAnchor:[12,24]});L.marker([${homeAddress.lat},${homeAddress.lng}],{icon:homeIcon}).addTo(map);`
    : "";

  const routeJS = route && route.length >= 2
    ? `L.polyline(${JSON.stringify(route)},{color:'#5BB4FF',weight:5,opacity:0.85,dashArray:'10,6'}).addTo(map);map.fitBounds(L.polyline(${JSON.stringify(route)}).getBounds(),{padding:[40,40]});`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#07080B}
.leaflet-tile-pane{filter:brightness(0.82) saturate(0.85)}
.leaflet-control-attribution{display:none}
@keyframes pulse-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.6);opacity:0}}
@keyframes pulse-dot{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
.current-dot-wrap{position:relative;width:20px;height:20px}
.current-dot-ring{position:absolute;inset:0;border-radius:50%;background:rgba(255,59,92,0.4);animation:pulse-ring 1.4s ease-out infinite}
.current-dot-ring2{position:absolute;inset:0;border-radius:50%;background:rgba(255,59,92,0.25);animation:pulse-ring 1.4s ease-out infinite .5s}
.current-dot{position:absolute;top:5px;left:5px;width:10px;height:10px;border-radius:50%;background:#FF3B5C;border:2px solid white;box-shadow:0 0 8px rgba(255,59,92,.8);animation:pulse-dot 1.4s ease-in-out infinite}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${currentPos[0]},${currentPos[1]}],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
var pts=${latlngsJS};
if(pts.length>=2){L.polyline(pts,{color:'#4ADE80',weight:3,opacity:0.9}).addTo(map);map.fitBounds(L.polyline(pts).getBounds(),{padding:[30,30]});}
${clusterJS}
${homeJS}
${routeJS}
var dotHtml='<div class="current-dot-wrap"><div class="current-dot-ring"></div><div class="current-dot-ring2"></div><div class="current-dot"></div></div>';
var dotIcon=L.divIcon({html:dotHtml,className:'',iconSize:[20,20],iconAnchor:[10,10]});
L.marker([${currentPos[0]},${currentPos[1]}],{icon:dotIcon}).addTo(map);
</script>
</body>
</html>`;
}

export default function HealthMap({ points, height = 300, homeAddress }: Props) {
  const [livePos, setLivePos] = useState<[number, number] | null>(null);
  const [locLoading, setLocLoading] = useState(true);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setLocLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLivePos([pos.coords.latitude, pos.coords.longitude]);
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { timeout: 5000, maximumAge: 60000, enableHighAccuracy: false },
    );
  }, []);

  // Clear route when homeAddress changes
  useEffect(() => { setRoute(null); }, [homeAddress?.lat, homeAddress?.lng]);

  const goHome = async () => {
    if (!homeAddress || !livePos) return;
    setRouteLoading(true);
    try {
      const result = await fetchRouteWithSteps(
        livePos[0], livePos[1],
        homeAddress.lat, homeAddress.lng,
      );
      if (result) {
        setRoute(result.coords.map(([lng, lat]) => [lat, lng] as [number, number]));
        speakVi(stepsToVietnamese(result));
      }
    } catch { } finally {
      setRouteLoading(false);
    }
  };

  const clearRoute = () => { setRoute(null); stopSpeaking(); };

  useEffect(() => () => { stopSpeaking(); }, []);

  const { html, hasData } = useMemo(() => {
    const sorted = points.length ? [...points].sort((a, b) => b.ts - a.ts) : null;
    const currentPos: [number, number] | null =
      livePos ?? (sorted ? [sorted[0].lat, sorted[0].lng] : null);

    if (!currentPos) return { html: "", hasData: false };

    const clusters = points.length ? clusterPoints(points) : [];
    return { html: buildLeafletHTML(points, clusters, currentPos, homeAddress, route ?? undefined), hasData: true };
  }, [points, livePos, homeAddress, route]);

  if (locLoading) {
    return (
      <View style={{ height, borderRadius: 16, backgroundColor: "#0E1016", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
        <ActivityIndicator color="#4ADE80" />
        <Text style={{ color: "#5A5E6B", fontSize: 12, marginTop: 4 }}>Đang lấy vị trí…</Text>
      </View>
    );
  }

  if (!hasData) {
    return (
      <View style={{ height, borderRadius: 16, backgroundColor: "#0E1016", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
        <Text style={{ fontSize: 28 }}>📍</Text>
        <Text style={{ color: "#F4F5F8", fontSize: 14, fontWeight: "700" }}>Không lấy được vị trí</Text>
        <Text style={{ color: "#5A5E6B", fontSize: 12, textAlign: "center", paddingHorizontal: 24 }}>
          Vui lòng cho phép truy cập vị trí trong trình duyệt
        </Text>
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
      {/* @ts-ignore */}
      <iframe srcDoc={html} style={{ width: "100%", height, border: "none", display: "block" }} title="Health Map" sandbox="allow-scripts" />
      {homeAddress && (
        <View style={{ flexDirection: "row", gap: 8, padding: 10, backgroundColor: "#0E1016", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
          <Pressable
            onPress={route ? clearRoute : goHome}
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
