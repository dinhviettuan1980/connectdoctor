import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View, ActivityIndicator, Platform, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";

const STORAGE_URL = process.env.EXPO_PUBLIC_STORAGE_URL ?? "https://api.tuandv.id.vn/storage";

const ROLE_LABEL: Record<string, string> = {
  patient: "Bệnh nhân",
  doctor: "Bác sĩ",
  admin: "Quản trị viên",
};

async function uploadAvatar(uri: string, uid: string): Promise<string> {
  const formData = new FormData();
  if (Platform.OS === "web") {
    // On web, ImagePicker returns a blob: URL — fetch it to get the actual Blob
    const blob = await fetch(uri).then((r) => r.blob());
    const ext = blob.type.split("/")[1] ?? "jpg";
    formData.append("file", blob, `avatar_${uid}.${ext}`);
  } else {
    const ext = uri.split(".").pop()?.split("?")[0] ?? "jpg";
    formData.append("file", { uri, name: `avatar_${uid}.${ext}`, type: `image/${ext}` } as any);
  }
  const res = await fetch(`${STORAGE_URL}/upload`, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  // Server may return a localhost URL when running behind a reverse proxy.
  // Rewrite to the correct public base so the stored URL is always fetchable.
  const rawUrl: string = json.url;
  const publicUrl = rawUrl.startsWith("http")
    ? STORAGE_URL + new URL(rawUrl).pathname.replace(/^\/storage/, "")
    : rawUrl;
  return publicUrl;
}

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const [visible, setVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Optimistic local URI — shown immediately after picking, cleared once
  // Firestore propagates the real URL back via onSnapshot.
  const [localUri, setLocalUri] = useState<string | null>(null);

  // Once the store reflects the new photoURL, drop the local preview.
  useEffect(() => {
    setLocalUri(null);
  }, [user?.photoURL]);

  const storedUri = user?.photoURL?.startsWith("file://") && Platform.OS === "web"
    ? undefined
    : user?.photoURL ?? undefined;
  const avatarUri = localUri ?? storedUri;

  const close = () => { setVisible(false); setConfirming(false); setPickingPhoto(false); };

  const handleLogout = async () => {
    close();
    await signOut();
  };

  const pickAndUpload = async (source: "camera" | "library") => {
    if (!user) return;
    setPickingPhoto(false);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) return;
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        if (Platform.OS !== "web") {
          const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!granted) return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,   // crop/resize UI before confirming
          aspect: [1, 1],
          quality: 0.8,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });
      }

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const selected = result.assets[0].uri;

      // Show immediately — don't wait for upload
      setLocalUri(selected);
      setUploading(true);

      try {
        const url = await uploadAvatar(selected, user.uid);
        await setDoc(doc(db, "users", user.uid), { photoURL: url }, { merge: true });
      } catch (e) {
        console.error("[avatar upload]", e);
        // Upload failed — localUri still shows the preview on this device,
        // but we don't persist a file:// URI to Firestore.
        setLocalUri(null);
      }
    } catch (e) {
      console.error("[avatar pick]", e);
      setLocalUri(null);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  const menuCard = (
    <View className="bg-paper border border-line rounded-card overflow-hidden">

      {/* User info header */}
      <View className="px-4 pt-4 pb-3 gap-2 border-b border-line-soft">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => {
              if (Platform.OS === "web") {
                pickAndUpload("library");
              } else {
                setPickingPhoto((v) => !v);
              }
            }}
          >
            {uploading ? (
              <View className="w-12 h-12 rounded-full bg-paper-2 items-center justify-center">
                <ActivityIndicator size="small" color="#5eb594" />
              </View>
            ) : (
              <View>
                <Avatar label={user.displayName ?? "?"} uri={avatarUri} size="lg" />
                <View
                  className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-accent items-center justify-center"
                  style={{ borderWidth: 1.5, borderColor: "#fafaf7" }}
                >
                  <Text style={{ fontSize: 8, color: "#fff" }}>✎</Text>
                </View>
              </View>
            )}
          </Pressable>

          <View className="flex-1">
            <Text className="text-xs font-bold text-ink" numberOfLines={1}>
              {user.displayName ?? "—"}
            </Text>
            {!!user.email && (
              <Text className="text-[11px] text-ink-3 mt-0.5" numberOfLines={1}>
                {user.email}
              </Text>
            )}
            {!!user.phone && (
              <Text className="text-[11px] text-ink-3" numberOfLines={1}>
                {user.phone}
              </Text>
            )}
          </View>
        </View>

        {/* Camera / library choice row — native only */}
        {pickingPhoto && (
          <View className="flex-row gap-2 mt-1">
            <Pressable
              onPress={() => pickAndUpload("camera")}
              className="flex-1 bg-paper-2 border border-line-soft rounded-lg py-2 items-center"
            >
              <Text className="text-xs font-bold text-ink">📷 Chụp ảnh</Text>
            </Pressable>
            <Pressable
              onPress={() => pickAndUpload("library")}
              className="flex-1 bg-paper-2 border border-line-soft rounded-lg py-2 items-center"
            >
              <Text className="text-xs font-bold text-ink">🖼 Thư viện</Text>
            </Pressable>
            <Pressable
              onPress={() => setPickingPhoto(false)}
              className="bg-paper-2 border border-line-soft rounded-lg px-3 py-2 items-center"
            >
              <Text className="text-xs text-ink-3">✕</Text>
            </Pressable>
          </View>
        )}

        <View className="self-start bg-accent-soft border border-accent-ink rounded-full px-2.5 py-0.5">
          <Text className="text-[10px] font-bold text-accent-ink uppercase tracking-wider">
            {ROLE_LABEL[user.role] ?? user.role}
          </Text>
        </View>
      </View>

      {/* Logout */}
      <View className="py-1">
        {confirming ? (
          <View className="px-4 py-3 gap-2">
            <Text className="text-xs text-ink-2">Bạn chắc muốn đăng xuất?</Text>
            <View className="flex-row gap-2">
              <Button variant="secondary" size="sm" onPress={() => setConfirming(false)}>Huỷ</Button>
              <Button variant="danger" size="sm" onPress={handleLogout}>Đăng xuất</Button>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirming(true)}
            className="flex-row items-center gap-3 px-4 py-3 active:bg-paper-2"
          >
            <Text className="text-danger text-sm">⎋</Text>
            <Text className="text-sm font-bold text-danger">Đăng xuất</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <>
      <Pressable onPress={() => setVisible(true)} hitSlop={8}>
        <Avatar label={user.displayName ?? "?"} uri={avatarUri} size="md" />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType={Platform.OS === "web" ? "none" : "fade"}
        onRequestClose={close}
      >
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.35)" }]}
          onPress={close}
        />
        <View style={{ position: "absolute", top: 60, right: 16, minWidth: 240 }}>
          {menuCard}
        </View>
      </Modal>
    </>
  );
}
