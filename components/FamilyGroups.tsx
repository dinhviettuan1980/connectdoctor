import { useEffect, useState } from "react";
import { View, Text, Pressable, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Section } from "@/components/ui/Segmented";
import { useAuthStore } from "@/hooks/useAuth";
import { subscribeToUserGroups, createFamilyGroup } from "@/lib/familyGroups";
import type { FamilyGroup } from "@/lib/types";

export function FamilyGroups() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToUserGroups(user.uid, setGroups);
  }, [user?.uid]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || !user) {
      Alert.alert("Thiếu tên", "Vui lòng nhập tên nhóm.");
      return;
    }
    setCreating(true);
    try {
      const gid = await createFamilyGroup(trimmed, user.uid, user.displayName ?? "Tôi");
      setShowCreate(false);
      setName("");
      router.push(`/(patient)/family-group/${gid}` as any);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Section
        title="NHÓM GIA ĐÌNH"
        action={
          <Pressable onPress={() => setShowCreate(true)} hitSlop={8}>
            <Text className="text-[11px] text-accent-ink">+ Tạo nhóm</Text>
          </Pressable>
        }
      >
        {groups.length === 0 ? (
          <Text className="text-[11px] text-ink-3">
            Chưa có nhóm. Tạo nhóm gia đình để chat, gọi video và chia sẻ vị trí với người thân.
          </Text>
        ) : (
          <View className="gap-1.5">
            {groups.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => router.push(`/(patient)/family-group/${g.id}` as any)}
                className="flex-row items-center gap-3 py-2 border-b border-dashed border-line-soft"
              >
                <View className="w-9 h-9 rounded-full bg-accent items-center justify-center">
                  <Text style={{ fontSize: 16 }}>👨‍👩‍👧</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-ink" numberOfLines={1}>{g.name}</Text>
                  <Text className="text-[10px] text-ink-3" numberOfLines={1}>
                    {g.members.length} thành viên{g.lastMessage ? ` · ${g.lastMessage}` : ""}
                  </Text>
                </View>
                <Text className="text-base text-ink-3">›</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Section>

      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView className="flex-1 bg-paper">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-line-soft">
              <Pressable onPress={() => setShowCreate(false)} hitSlop={8}>
                <Text className="text-sm text-ink-3">Huỷ</Text>
              </Pressable>
              <Text className="text-sm font-bold text-ink">Tạo nhóm gia đình</Text>
              <Pressable onPress={handleCreate} disabled={creating} hitSlop={8}>
                {creating
                  ? <ActivityIndicator size="small" color="#5eb594" />
                  : <Text className="text-sm font-bold text-accent-ink">Tạo</Text>}
              </Pressable>
            </View>
            <View className="p-4 gap-3">
              <Text className="text-xs text-ink-3">Đặt tên cho nhóm, ví dụ "Gia đình Nguyễn"</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Tên nhóm…"
                placeholderTextColor="#b5b5b5"
                style={{ borderWidth: 1, borderColor: "#c8c8c2", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#1a1a1a" }}
                autoFocus
              />
              <Text className="text-[10px] text-ink-3 mt-2">
                Sau khi tạo, bạn có thể thêm thành viên từ danh sách Người thân (chỉ thành viên có tài khoản ConnectDoctor mới thêm được).
              </Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
