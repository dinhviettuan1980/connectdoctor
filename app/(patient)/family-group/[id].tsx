import { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import VideoCallModal from "@/components/VideoCallModal";
import FamilyMap, { type MemberStream } from "@/components/FamilyMap";
import { useAuthStore } from "@/hooks/useAuth";
import {
  subscribeToGroup, subscribeToGroupMessages, sendGroupMessage,
  removeMember, deleteFamilyGroup, renameFamilyGroup, addMember,
  shareLocationWith, type GroupMessage,
} from "@/lib/familyGroups";
import { fetchLocationHistory } from "@/lib/locationApi";
import { getPatientProfile } from "@/lib/patientProfile";
import { subscribeToUser, isOnline } from "@/lib/users";
import { formatTime } from "@/lib/time";
import type { AppUser, FamilyGroup, PatientProfile } from "@/lib/types";

const MEMBER_COLORS = ["#4ADE80", "#5BB4FF", "#FFA552", "#B287FF", "#FACC15", "#FF7A8A", "#22D3EE", "#F472B6"];

type Tab = "chat" | "map" | "members";

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function FamilyGroupScreen() {
  const router = useRouter();
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [tab, setTab] = useState<Tab>("chat");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [streams, setStreams] = useState<MemberStream[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [memberDetails, setMemberDetails] = useState<Record<string, AppUser | null>>({});
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!groupId) return;
    return subscribeToGroup(groupId, setGroup);
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    return subscribeToGroupMessages(groupId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
  }, [groupId]);

  // Auto-sync own locationSharedWith with group members
  useEffect(() => {
    if (!user?.uid || !group) return;
    shareLocationWith(user.uid, group.members);
  }, [user?.uid, group?.members?.join(",")]);

  // Fetch profile for emergency contacts (for adding members)
  useEffect(() => {
    if (!user?.uid) return;
    getPatientProfile(user.uid).then(setProfile);
  }, [user?.uid]);

  // Subscribe to each member's user doc for online status / display name
  useEffect(() => {
    if (!group) return;
    const unsubs = group.members.map((uid) =>
      subscribeToUser(uid, (u) => setMemberDetails((prev) => ({ ...prev, [uid]: u })))
    );
    return () => unsubs.forEach((u) => u());
  }, [group?.members?.join(",")]);

  // Fetch tracking for all members when map tab opens
  useEffect(() => {
    if (tab !== "map" || !group) return;
    setMapLoading(true);
    const date = todayString();
    Promise.all(
      group.members.map(async (uid, i) => {
        const points = await fetchLocationHistory(uid, date).catch(() => []);
        return {
          uid,
          name: group.memberNames[uid] || memberDetails[uid]?.displayName || "Người dùng",
          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
          points,
        };
      })
    ).then((results) => {
      setStreams(results);
      setMapLoading(false);
    });
  }, [tab, group?.members?.join(","), groupId]);

  const send = async () => {
    if (!draft.trim() || !groupId || !user) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    try {
      await sendGroupMessage(groupId, user.uid, user.displayName ?? "Bạn", text);
    } catch (err) {
      console.error("[group-chat send]", err);
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const isOwner = group?.ownerUid === user?.uid;

  const handleRemoveMember = (memberUid: string) => {
    if (!groupId || !group) return;
    if (memberUid === group.ownerUid) {
      Alert.alert("Không thể xoá chủ nhóm", "Chủ nhóm chỉ có thể giải tán nhóm.");
      return;
    }
    Alert.alert("Xoá thành viên", `Xoá ${group.memberNames[memberUid] || "thành viên"} khỏi nhóm?`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => removeMember(groupId, memberUid) },
    ]);
  };

  const handleLeave = () => {
    if (!groupId || !user) return;
    Alert.alert("Rời nhóm", "Bạn sẽ không còn thấy tin nhắn và tracking của nhóm này.", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Rời", style: "destructive",
        onPress: async () => {
          await removeMember(groupId, user.uid);
          router.back();
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!groupId) return;
    Alert.alert("Giải tán nhóm", "Tất cả tin nhắn sẽ mất. Không thể khôi phục.", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Giải tán", style: "destructive",
        onPress: async () => {
          await deleteFamilyGroup(groupId);
          router.back();
        },
      },
    ]);
  };

  const handleAddMember = (uid: string, name: string) => {
    if (!groupId) return;
    addMember(groupId, uid, name).catch((e) => Alert.alert("Lỗi", e.message));
  };

  const handleRename = () => {
    if (!groupId || !group) return;
    Alert.prompt("Đổi tên nhóm", "", (newName) => {
      const trimmed = newName?.trim();
      if (trimmed) renameFamilyGroup(groupId, trimmed);
    }, "plain-text", group.name);
  };

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-paper items-center justify-center">
        <ActivityIndicator color="#5eb594" />
        <Text className="text-xs text-ink-3 mt-2">Đang tải nhóm…</Text>
      </SafeAreaView>
    );
  }

  // Linked emergency contacts not already in group
  const candidateContacts = (profile?.emergencyContacts ?? [])
    .filter((c) => c.linkedUid && !group.members.includes(c.linkedUid));

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-3 py-3 flex-row items-center gap-2 border-b border-line-soft">
          <Pressable onPress={() => router.back()} hitSlop={8} className="w-7 h-7 items-center justify-center">
            <Text className="text-xl text-ink-2">‹</Text>
          </Pressable>
          <Pressable onPress={isOwner ? handleRename : undefined} className="flex-1">
            <Text className="text-sm font-bold text-ink" numberOfLines={1}>{group.name}</Text>
            <Text className="text-[11px] text-ink-3">{group.members.length} thành viên</Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View className="px-3 py-2">
          <Segmented
            value={tab}
            options={[
              { value: "chat", label: "💬 Chat" },
              { value: "map", label: "📍 Bản đồ" },
              { value: "members", label: "👥 Thành viên" },
            ]}
            onChange={(v) => setTab(v as Tab)}
          />
        </View>

        {tab === "chat" && (
          <>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
              {messages.length === 0 && (
                <Text className="text-[11px] text-ink-3 text-center mt-4">Chưa có tin nhắn. Gửi lời chào nhé!</Text>
              )}
              {messages.map((m) => {
                const mine = m.fromUid === user?.uid;
                return (
                  <View key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                    {!mine && (
                      <Text className="text-[10px] text-ink-3 mb-0.5 ml-1">{m.fromName}</Text>
                    )}
                    <View className={["px-3 py-2 border rounded-2xl", mine ? "bg-accent-soft border-accent-ink rounded-br-sm" : "bg-paper border-line rounded-bl-sm"].join(" ")}>
                      <Text className="text-xs text-ink">{m.text}</Text>
                    </View>
                    <Text className="text-[10px] text-ink-3 mt-0.5" style={{ textAlign: mine ? "right" : "left" }}>
                      {formatTime(m.createdAt)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            <View className="flex-row items-center gap-2 px-3 py-2 border-t border-line">
              <View className="flex-1 border border-line bg-paper rounded-full px-3 py-1.5">
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Nhập tin nhắn…"
                  placeholderTextColor="#b5b5b5"
                  className="text-sm text-ink"
                  onSubmitEditing={send}
                  returnKeyType="send"
                  editable={!sending}
                />
              </View>
              <Button variant="primary" size="sm" onPress={send} disabled={sending}>
                {sending ? "…" : "↑"}
              </Button>
            </View>
          </>
        )}

        {tab === "map" && (
          <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
            <FamilyMap streams={streams} loading={mapLoading} height={420} />
            <View className="gap-2 mt-2">
              {streams.map((s, i) => (
                <View key={s.uid} className="flex-row items-center gap-2">
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: s.color }} />
                  <Text className="text-xs font-bold text-ink flex-1">{s.name}</Text>
                  <Text className="font-mono text-[10px] text-ink-3">
                    {s.points.length} điểm hôm nay
                  </Text>
                </View>
              ))}
            </View>
            <Text className="text-[10px] text-ink-3 text-center mt-2">
              Tracking chỉ cập nhật khi thành viên di chuyển và bật chia sẻ vị trí.
            </Text>
          </ScrollView>
        )}

        {tab === "members" && (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View className="gap-2">
              <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3">THÀNH VIÊN ({group.members.length})</Text>
              {group.members.map((uid) => {
                const u = memberDetails[uid];
                const name = group.memberNames[uid] || u?.displayName || "Người dùng";
                const online = isOnline(u);
                return (
                  <View key={uid} className="flex-row items-center gap-3 py-2 border-b border-dashed border-line-soft">
                    <View>
                      <Avatar label={name} uri={u?.photoURL ?? undefined} />
                      <View
                        style={{
                          position: "absolute", bottom: 0, right: 0,
                          width: 10, height: 10, borderRadius: 5,
                          backgroundColor: online ? "#22c55e" : "#9ca3af",
                          borderWidth: 1.5, borderColor: "#fafaf7",
                        }}
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-xs font-bold text-ink">{name}</Text>
                        {uid === group.ownerUid && (
                          <View className="bg-accent-soft px-1.5 py-0.5 rounded">
                            <Text className="text-[9px] font-bold text-accent-ink">CHỦ</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[10px]" style={{ color: online ? "#16a34a" : "#9ca3af" }}>
                        {online ? "● Đang hoạt động" : "○ Ngoại tuyến"}
                      </Text>
                    </View>
                    {(isOwner && uid !== user?.uid) && (
                      <Pressable onPress={() => handleRemoveMember(uid)} hitSlop={8}>
                        <Text className="text-[11px] text-danger">Xoá</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>

            {isOwner && candidateContacts.length > 0 && (
              <View className="gap-2">
                <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3">THÊM TỪ NGƯỜI THÂN</Text>
                {candidateContacts.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => handleAddMember(c.linkedUid!, c.name)}
                    className="flex-row items-center gap-3 py-2 border-b border-dashed border-line-soft"
                  >
                    <Avatar label={c.name} />
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-ink">{c.name}</Text>
                      {c.relation && <Text className="text-[10px] text-ink-3">{c.relation}</Text>}
                    </View>
                    <Text className="text-[11px] text-accent-ink">+ Thêm</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {isOwner && candidateContacts.length === 0 && (
              <Text className="text-[11px] text-ink-3 text-center">
                Để thêm thành viên, vào Hồ sơ → Người thân và thêm liên hệ có liên kết tài khoản ConnectDoctor.
              </Text>
            )}

            <View className="gap-2 mt-4">
              {isOwner ? (
                <Pressable onPress={handleDelete} className="bg-danger px-4 py-2 rounded-lg items-center">
                  <Text className="text-white text-xs font-bold">Giải tán nhóm</Text>
                </Pressable>
              ) : (
                <Pressable onPress={handleLeave} className="border border-danger px-4 py-2 rounded-lg items-center">
                  <Text className="text-danger text-xs font-bold">Rời nhóm</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}
