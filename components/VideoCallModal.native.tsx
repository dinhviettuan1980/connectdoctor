import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Modal, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

interface Props {
  visible: boolean;
  room: string;
  displayName: string;
  onClose: () => void;
}

export default function VideoCallModal({ visible, room, displayName, onClose }: Props) {
  const [loading, setLoading] = useState(true);

  const url = `https://meet.jit.si/${encodeURIComponent(room)}#userInfo.displayName=%22${encodeURIComponent(displayName)}%22&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          <Pressable onPress={onClose} hitSlop={8} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" }}>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>✕ Kết thúc</Text>
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 13, flex: 1 }} numberOfLines={1}>📹 {displayName}</Text>
        </View>

        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {visible && (
            <WebView
              source={{ uri: url }}
              onLoadEnd={() => setLoading(false)}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo
              originWhitelist={["*"]}
              style={{ flex: 1, backgroundColor: "#000" }}
              renderLoading={() => (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
                  <ActivityIndicator color="#fff" />
                  <Text style={{ color: "#fff", marginTop: 8, fontSize: 12 }}>Đang kết nối cuộc gọi…</Text>
                </View>
              )}
              startInLoadingState
            />
          )}
          {loading && (
            <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: "#fff", marginTop: 8, fontSize: 12 }}>Đang kết nối cuộc gọi…</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
