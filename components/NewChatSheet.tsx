import { useEffect, useMemo, useState } from "react";
import {
  View, Text, Pressable, Modal, TextInput, FlatList, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Alert } from "@/lib/alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/hooks/useAuth";
import { createFamilyGroup, addMember } from "@/lib/familyGroups";
import { listAllUsers } from "@/lib/users";
import type { AppUser } from "@/lib/types";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Mode = "menu" | "newGroup" | "newChat";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[parts.length - 2][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

export function NewChatSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<Mode>("menu");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Create group state
  const [groupName, setGroupName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMode("menu");
    setGroupName("");
    setQuery("");
    setPicked(new Set());
    if (!user?.uid) return;
    setLoading(true);
    listAllUsers(500)
      .then((list) => setUsers(list.filter((u) => u.uid !== user.uid)))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [visible, user?.uid]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.displayName ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.phone ?? "").includes(q)
    );
  }, [users, query]);

  const togglePick = (uid: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleStart1on1 = (u: AppUser) => {
    onClose();
    router.push(`/(patient)/family-chat/${u.uid}` as any);
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) { Alert.alert("Thiếu tên nhóm", "Vui lòng đặt tên cho nhóm."); return; }
    if (!user) return;
    setCreating(true);
    try {
      const gid = await createFamilyGroup(name, user.uid, user.displayName ?? "Tôi");
      const toAdd = users.filter((u) => picked.has(u.uid));
      for (const u of toAdd) {
        await addMember(gid, u.uid, u.displayName ?? "Thành viên");
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#fafaf7", paddingTop: insets.top }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#c8c8c2" }}>
            <Pressable
              onPress={() => (mode === "menu" ? onClose() : setMode("menu"))}
              hitSlop={12}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f1f0ea", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 16, color: "#1a1a1a" }}>{mode === "menu" ? "✕" : "‹"}</Text>
            </Pressable>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>
              {mode === "menu" ? "Mới" : mode === "newGroup" ? "Tạo nhóm gia đình" : "Chọn người để chat"}
            </Text>
            {mode === "newGroup" ? (
              <Pressable
                onPress={handleCreateGroup}
                disabled={creating}
                hitSlop={12}
                style={{ backgroundColor: groupName.trim() ? "#5eb594" : "#dceee4", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}
              >
                {creating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ fontSize: 13, fontWeight: "700", color: groupName.trim() ? "#fff" : "#9aaa9f" }}>Tạo</Text>}
              </Pressable>
            ) : (
              <View style={{ width: 36 }} />
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
                  <Text className="text-[11px] text-ink-3">Chat nhóm, gọi điện, chia sẻ vị trí</Text>
                </View>
                <Text className="text-base text-ink-3">›</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("newChat")}
                className="flex-row items-center gap-3 p-4 bg-paper-2 border border-line rounded-lg"
              >
                <Text style={{ fontSize: 26 }}>💬</Text>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-ink">Nhắn tin 1-1</Text>
                  <Text className="text-[11px] text-ink-3">Tìm và chat với bất kỳ ai trên ConnectDoctor</Text>
                </View>
                <Text className="text-base text-ink-3">›</Text>
              </Pressable>
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
              <View className="px-4 py-2 border-b border-line-soft">
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Tìm tên, email, số điện thoại…"
                  placeholderTextColor="#b5b5b5"
                  style={{ backgroundColor: "#f1f0ea", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: "#1a1a1a" }}
                />
              </View>
              <View className="px-4 py-2 flex-row items-center justify-between">
                <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3">
                  ĐÃ CHỌN ({picked.size})
                </Text>
                <Text className="text-[10px] text-ink-3">Bạn là chủ nhóm</Text>
              </View>
              {loading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator color="#5eb594" />
                </View>
              ) : filteredUsers.length === 0 ? (
                <Text className="text-[11px] text-ink-3 text-center px-6 mt-4">
                  {users.length === 0 ? "Chưa có user nào trên hệ thống." : "Không có kết quả."}
                </Text>
              ) : (
                <FlatList
                  data={filteredUsers}
                  keyExtractor={(u) => u.uid}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const checked = picked.has(item.uid);
                    return (
                      <Pressable
                        onPress={() => togglePick(item.uid)}
                        className="flex-row items-center gap-3 py-2.5 border-b border-line-soft"
                      >
                        <Avatar label={item.displayName ?? "?"} uri={item.photoURL ?? undefined} />
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-ink" numberOfLines={1}>
                            {item.displayName ?? "Người dùng"}
                          </Text>
                          <Text className="text-[10px] text-ink-3" numberOfLines={1}>
                            {item.email || item.phone || item.uid.slice(0, 8)}
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 24, height: 24, borderRadius: 12,
                            borderWidth: 2,
                            borderColor: checked ? "#2f6b54" : "#c8c8c2",
                            backgroundColor: checked ? "#5eb594" : "transparent",
                            alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {checked && <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</Text>}
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
              <View className="px-4 py-3 border-b border-line-soft">
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Tìm tên, email, số điện thoại…"
                  placeholderTextColor="#b5b5b5"
                  style={{ backgroundColor: "#f1f0ea", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#1a1a1a" }}
                  autoFocus
                />
              </View>
              {loading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator color="#5eb594" />
                </View>
              ) : filteredUsers.length === 0 ? (
                <Text className="text-[11px] text-ink-3 text-center px-6 mt-8">
                  {users.length === 0 ? "Chưa có user nào." : "Không có kết quả."}
                </Text>
              ) : (
                <FlatList
                  data={filteredUsers}
                  keyExtractor={(u) => u.uid}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleStart1on1(item)}
                      className="flex-row items-center gap-3 py-2.5 border-b border-line-soft"
                    >
                      <Avatar label={item.displayName ?? "?"} uri={item.photoURL ?? undefined} />
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-ink" numberOfLines={1}>
                          {item.displayName ?? "Người dùng"}
                        </Text>
                        <Text className="text-[10px] text-ink-3" numberOfLines={1}>
                          {item.email || item.phone || item.uid.slice(0, 8)}
                        </Text>
                      </View>
                      <Text className="text-base text-ink-3">›</Text>
                    </Pressable>
                  )}
                />
              )}
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
