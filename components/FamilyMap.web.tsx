import { useMemo } from "react";
import { View, Text, ActivityIndicator } from "react-native";
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

function buildLeafletHTML(streams: MemberStream[]): string {
  const allPoints = streams.flatMap((s) => s.points.map((p) => `[${p.lat},${p.lng}]`));
  if (allPoints.length === 0) return "";
  const center = streams.flatMap((s) => s.points)[0];

  const streamJS = streams.map((s, idx) => {
    const coords = `[${s.points.map((p) => `[${p.lat},${p.lng}]`).join(",")}]`;
    const latest = s.points[s.points.length - 1];
    const markerJS = latest
      ? `var ic${idx}=L.divIcon({html:'<div style="background:${s.color};color:white;font-size:11px;font-weight:700;padding:2px 6px;border-radius:8px;border:1.5px solid white;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4)">${s.name.replace(/'/g, "\\'")}</div>',className:'',iconSize:[60,18],iconAnchor:[30,18]});L.marker([${latest.lat},${latest.lng}],{icon:ic${idx}}).addTo(map);`
      : "";
    const polyJS = s.points.length >= 2
      ? `L.polyline(${coords},{color:'${s.color}',weight:3,opacity:0.85}).addTo(map);`
      : "";
    return polyJS + markerJS;
  }).join("\n");

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
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${center.lat},${center.lng}],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
${streamJS}
var allPts=${JSON.stringify(allPoints.map((s) => JSON.parse(s)))};
if(allPts.length>1)map.fitBounds(allPts,{padding:[30,30]});
</script>
</body>
</html>`;
}

export default function FamilyMap({ streams, height = 360, loading }: Props) {
  const html = useMemo(() => buildLeafletHTML(streams), [streams]);
  const hasData = streams.some((s) => s.points.length > 0);

  if (loading) {
    return (
      <View style={{ height, borderRadius: 16, backgroundColor: "#0E1016", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#4ADE80" />
        <Text style={{ color: "#5A5E6B", fontSize: 12, marginTop: 8 }}>Đang tải tracking…</Text>
      </View>
    );
  }

  if (!hasData) {
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
    <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
      {/* @ts-ignore */}
      <iframe srcDoc={html} style={{ width: "100%", height, border: "none", display: "block" }} title="Family map" sandbox="allow-scripts" />
    </View>
  );
}
