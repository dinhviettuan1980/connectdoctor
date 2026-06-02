import { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, Pressable, TextInput, FlatList,
  ActivityIndicator, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { geocode, type NominatimResult } from "@/lib/geocoding";

export interface PickedAddress { label: string; lat: number; lng: number }

interface Props {
  visible: boolean;
  initial?: PickedAddress;
  onClose: () => void;
  onSelect: (addr: PickedAddress) => void;
}

function buildLeafletHTML(center: [number, number], pin?: [number, number]): string {
  const pinJS = pin
    ? `var pinIcon=L.divIcon({html:'<div style="font-size:28px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,.5))">📍</div>',className:'',iconSize:[28,28],iconAnchor:[14,28]});L.marker([${pin[0]},${pin[1]}],{icon:pinIcon}).addTo(map);map.setView([${pin[0]},${pin[1]}],16);`
    : "";
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#fafaf7}
.leaflet-control-attribution{display:none}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${center[0]},${center[1]}],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
var meIcon=L.divIcon({html:'<div style="width:14px;height:14px;background:#1a73e8;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(26,115,232,.6)"></div>',className:'',iconSize:[14,14],iconAnchor:[7,7]});
L.marker([${center[0]},${center[1]}],{icon:meIcon}).addTo(map);
${pinJS}
</script>
</body>
</html>`;
}

export default function HomeAddressPicker({ visible, initial, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<PickedAddress | null>(initial ?? null);
  const [center, setCenter] = useState<[number, number]>([21.0285, 105.8542]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPicked(initial ?? null);
    setQuery(""); setResults([]);
    if (initial) {
      setCenter([initial.lat, initial.lng]);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { timeout: 5000, maximumAge: 60000, enableHighAccuracy: false },
    );
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try { setResults(await geocode(query)); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const runSearchNow = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) return;
    setSearching(true);
    try { setResults(await geocode(query)); }
    finally { setSearching(false); }
  };

  const choose = (item: NominatimResult) => {
    const lat = parseFloat(item.lat), lng = parseFloat(item.lon);
    setPicked({ label: item.display_name, lat, lng });
    setCenter([lat, lng]);
  };

  const confirm = () => { if (picked) onSelect(picked); };

  const html = useMemo(
    () => buildLeafletHTML(center, picked ? [picked.lat, picked.lng] : undefined),
    [center, picked],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-paper">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#c8c8c2", backgroundColor: "#fafaf7" }}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}
          >
            <Text style={{ fontSize: 22, color: "#1a1a1a", marginRight: 4 }}>‹</Text>
            <Text style={{ fontSize: 14, color: "#1a1a1a", fontWeight: "600" }}>Quay lại</Text>
          </Pressable>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>Chọn địa chỉ nhà</Text>
          <Pressable
            onPress={confirm}
            disabled={!picked}
            hitSlop={12}
            style={{
              backgroundColor: picked ? "#5eb594" : "#dceee4",
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: picked ? "#ffffff" : "#9aaa9f" }}>Lưu</Text>
          </Pressable>
        </View>

        <View style={{ height: 260 }}>
          {/* @ts-ignore */}
          <iframe srcDoc={html} style={{ width: "100%", height: "100%", border: "none", display: "block" }} title="Pick home address" sandbox="allow-scripts" />
        </View>

        <View className="flex-row gap-2 px-4 py-3">
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearchNow}
            placeholder="Nhập địa chỉ (gõ để tự tìm)…"
            placeholderTextColor="#b5b5b5"
            returnKeyType="search"
            style={{ flex: 1, borderWidth: 1, borderColor: "#c8c8c2", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#1a1a1a" }}
            autoFocus
          />
          <Pressable
            onPress={runSearchNow}
            style={{ backgroundColor: "#5eb594", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" }}
          >
            {searching
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Tìm</Text>}
          </Pressable>
        </View>

        {picked && (
          <View className="mx-4 mb-2 p-3 bg-accent-soft rounded-lg flex-row items-start gap-2">
            <Text className="text-base">📍</Text>
            <View className="flex-1">
              <Text className="text-xs text-ink" numberOfLines={2}>{picked.label}</Text>
              <Text className="font-mono text-[10px] text-ink-3 mt-0.5">
                {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
              </Text>
            </View>
          </View>
        )}

        <FlatList
          data={results}
          keyExtractor={(item, i) => item.place_id ?? `${i}`}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ListEmptyComponent={
            <Text className="text-[11px] text-ink-3 text-center mt-6">
              {query.trim()
                ? (searching ? "Đang tìm…" : "Không tìm thấy kết quả")
                : "Nhập địa chỉ và xem trên bản đồ"}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => choose(item)}
              className="py-3 border-b border-line-soft"
            >
              <Text className="text-sm text-ink" numberOfLines={2}>{item.display_name}</Text>
              <Text className="font-mono text-[10px] text-ink-3 mt-0.5">
                {parseFloat(item.lat).toFixed(5)}, {parseFloat(item.lon).toFixed(5)}
              </Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
