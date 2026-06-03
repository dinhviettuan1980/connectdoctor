import { useEffect, useRef, useState } from "react";
import {
  View, Text, Pressable, TextInput, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";
import * as Location from "expo-location";
import { geocode, type NominatimResult } from "@/lib/geocoding";

export interface PickedAddress { label: string; lat: number; lng: number }

interface Props {
  visible: boolean;
  initial?: PickedAddress;
  onClose: () => void;
  onSelect: (addr: PickedAddress) => void;
}

const DEFAULT_REGION: Region = {
  latitude: 21.0285, longitude: 105.8542,  // Hanoi center
  latitudeDelta: 0.05, longitudeDelta: 0.05,
};

export default function HomeAddressPicker({ visible, initial, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<PickedAddress | null>(initial ?? null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Center on current location when modal opens
  useEffect(() => {
    if (!visible) return;
    setPicked(initial ?? null);
    setQuery(""); setResults([]);
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") {
          const { status: s2 } = await Location.requestForegroundPermissionsAsync();
          if (s2 !== "granted") return;
        }
        const last = await Location.getLastKnownPositionAsync();
        const target = initial
          ? { latitude: initial.lat, longitude: initial.lng }
          : last
            ? { latitude: last.coords.latitude, longitude: last.coords.longitude }
            : null;
        if (target) {
          const r: Region = { ...target, latitudeDelta: 0.012, longitudeDelta: 0.012 };
          setRegion(r);
          mapRef.current?.animateToRegion(r, 300);
        }
        if (!initial) {
          const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
          const r: Region = {
            latitude: fresh.coords.latitude, longitude: fresh.coords.longitude,
            latitudeDelta: 0.012, longitudeDelta: 0.012,
          };
          setRegion(r);
          mapRef.current?.animateToRegion(r, 300);
        }
      } catch { }
    })();
  }, [visible]);

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await geocode(query));
      } catch { setResults([]); } finally { setSearching(false); }
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
    const r: Region = { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
    setRegion(r);
    mapRef.current?.animateToRegion(r, 400);
  };

  const confirm = () => { if (picked) onSelect(picked); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#fafaf7", paddingTop: insets.top }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
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

          {/* Map */}
          <View style={{ height: 260 }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              provider={PROVIDER_DEFAULT}
              initialRegion={region}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              {picked && (
                <Marker coordinate={{ latitude: picked.lat, longitude: picked.lng }} anchor={{ x: 0.5, y: 1 }}>
                  <Text style={{ fontSize: 28 }}>📍</Text>
                </Marker>
              )}
            </MapView>
          </View>

          {/* Search */}
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

          {/* Picked address card */}
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

          {/* Results */}
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
