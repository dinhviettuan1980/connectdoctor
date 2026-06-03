import { useEffect, useMemo, useState } from "react";
import {
  View, Text, Pressable, Modal, TextInput, FlatList, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/hooks/useAuth";
import { getPatientProfile } from "@/lib/patientProfile";
import { createFamilyGroup, addMember } from "@/lib/familyGroups";
import type { EmergencyContact, PatientProfile } from "@/lib/types";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Mode = "menu" | "newGroup" | "newChat";

export function NewChatSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<Mode>("menu");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Create group state
  const [groupName, setGroupName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMode("menu");
    setGroupName("");
    setPicked(new Set());
    if (!user?.uid) return;
    setLoading(true);
    getPatientProfile(user.uid).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [visible, user?.uid]);

  const linkedContacts = useMemo<EmergencyContact[]>(
    () => (profile?.emergencyContacts ?? []).filter((c) => c.linkedUid),
    [profile?.emergencyContacts],
  );

  const togglePick = (uid: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleStart1on1 = (c: EmergencyContact) => {
    if (!c.linkedUid) return;
    onClose();
    router.push(`/(patient)/family-chat/${c.linkedUid}` as any);
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      Alert.alert("Thiếu tên nhóm", "Vui lòng đặt tên cho nhóm.");
      return;
    }
    if (!user) return;
    setCreating(true);
    try {
      const gid = await createFamilyGroup(name, user.uid, user.displayName ?? "Tôi");
      // Add picked members
      const toAdd = linkedContacts.filter((c) => picked.has(c.linkedUid!));
      for (const c of toAdd) {
        await addMember(gid, c.linkedUid!, c.name);
      }
      onClose();
      router.push(`/(patient)/family-group/${gid}` as any);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message ?? "Không tạo được nhóm.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="formSheet">
      <SafeAreaView className="flex-1 bg-paper">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-line-soft">
            <Pressable
              onPress={() => (mode === "menu" ? onClose() : setMode("menu"))}
              hitSlop={8}
              className="w-8 h-8 items-center justify-center rounded-full bg-paper-2"
            >
              <Text className="text-base text-ink-2">{mode === "menu" ? "✕" : "‹"}</Text>
            </Pressable>
            <Text className="text-sm font-bold text-ink">
              {mode === "menu" ? "Mới" : mode === "newGroup" ? "Tạo nhóm gia đình" : "Chọn người để chat"}
            </Text>
            {mode === "newGroup" ? (
              <Pressable onPress={handleCreateGroup} disabled={creating} hitSlop={8}>
                {creating
                  ? <ActivityIndicator size="small" color="#5eb594" />
                  : <Text className="text-sm font-bold text-accent-ink">Tạo</Text>}
              </Pressable>
            ) : (
              <View style={{ width: 32 }} />
            )}
          </View>

          {mode === "menu" && (
            <View className="p-4 gap-2">
              <Pressable
                onPress={() => setMode("newGroup")}
                className="flex-row items-center gap-3 p-4 bg-accent-soft border border-accent-ink rounded-lg"
              >
                <Text style={{ fontSize: 26 }}>👨‍👩‍👧</Text>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-ink">Tạo nhóm gia đình</Text>
                  <Text className="text-[11px] text-ink-3">Chat nhóm, gọi video, chia sẻ vị trí</Text>
                </View>
                <Text className="text-base text-ink-3">›</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("newChat")}
                className="flex-row items-center gap-3 p-4 bg-paper-2 border border-line rounded-lg"
              >
                <Text style={{ fontSize: 26 }}>💬</Text>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-ink">Nhắn tin với người thân</Text>
                  <Text className="text-[11px] text-ink-3">Chat 1-1 với liên hệ đã liên kết</Text>
                </View>
                <Text className="text-base text-ink-3">›</Text>
              </Pressable>

              <Text className="text-[10px] text-ink-3 text-center mt-4 px-4">
                Chỉ người thân đã có tài khoản ConnectDoctor và được liên kết (email/số trùng) mới hiện ở đây. Thêm mới trong Hồ sơ → Người thân.
              </Text>
            </View>
          )}

          {mode === "newGroup" && (
            <>
              <View className="p-4 gap-3 border-b border-line-soft">
                <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3">TÊN NHÓM</Text>
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="VD: Gia đình Nguyễn"
                  placeholderTextColor="#b5b5b5"
                  style={{ borderWidth: 1, borderColor: "#c8c8c2", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#1a1a1a" }}
                  autoFocus
                />
              </View>
              <View className="px-4 py-2 flex-row items-center justify-between">
                <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3">
                  THÀNH VIÊN ({picked.size})
                </Text>
                <Text className="text-[10px] text-ink-3">Bạn là chủ nhóm</Text>
              </View>
              {loading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator color="#5eb594" />
                </View>
              ) : linkedContacts.length === 0 ? (
                <Text className="text-[11px] text-ink-3 text-center px-6 mt-4">
                  Chưa có người thân nào liên kết tài khoản. Vào Hồ sơ → Người thân để thêm.
                </Text>
              ) : (
                <FlatList
                  data={linkedContacts}
                  keyExtractor={(c) => c.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                  renderItem={({ item }) => {
                    const checked = picked.has(item.linkedUid!);
                    return (
                      <Pressable
                        onPress={() => togglePick(item.linkedUid!)}
                        className="flex-row items-center gap-3 py-2.5 border-b border-line-soft"
                      >
                        <Avatar label={item.name} />
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-ink">{item.name}</Text>
                          {item.relation && <Text className="text-[10px] text-ink-3">{item.relation}</Text>}
                        </View>
                        <View
                          className={["w-6 h-6 rounded-full border-2 items-center justify-center", checked ? "bg-accent border-accent-ink" : "border-line"].join(" ")}
                        >
                          {checked && <Text className="text-white text-xs">✓</Text>}
                        </View>
                      </Pressable>
                    );
                  }}
                />
              )}
            </>
          )}

          {mode === "newChat" && (
            <>
              {loading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator color="#5eb594" />
                </View>
              ) : linkedContacts.length === 0 ? (
                <Text className="text-[11px] text-ink-3 text-center px-6 mt-8">
                  Chưa có người thân nào liên kết tài khoản. Vào Hồ sơ → Người thân để thêm.
                </Text>
              ) : (
                <FlatList
                  data={linkedContacts}
                  keyExtractor={(c) => c.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleStart1on1(item)}
                      className="flex-row items-center gap-3 py-2.5 border-b border-line-soft"
                    >
                      <Avatar label={item.name} />
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-ink">{item.name}</Text>
                        {item.relation && <Text className="text-[10px] text-ink-3">{item.relation}</Text>}
                      </View>
                      <Text className="text-base text-ink-3">›</Text>
                    </Pressable>
                  )}
                />
              )}
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
