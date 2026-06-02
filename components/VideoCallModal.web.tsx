import { View, Text, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  room: string;
  displayName: string;
  onClose: () => void;
}

export default function VideoCallModal({ visible, room, displayName, onClose }: Props) {
  const url = `https://meet.jit.si/${encodeURIComponent(room)}#userInfo.displayName=%22${encodeURIComponent(displayName)}%22&config.prejoinPageEnabled=false`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          <Pressable onPress={onClose} hitSlop={8} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" }}>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>✕ Kết thúc</Text>
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 13, flex: 1 }} numberOfLines={1}>📹 {displayName}</Text>
        </View>
        {visible && (
          // @ts-ignore - iframe is fine in RN-Web
          <iframe
            src={url}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ flex: 1, border: "none", width: "100%", height: "100%", backgroundColor: "#000" }}
            title="Video call"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
