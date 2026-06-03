import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { UserMenu } from "@/components/UserMenu";
import { NewChatSheet } from "@/components/NewChatSheet";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/hooks/useAuth";
import { subscribeToThreads, type ThreadWithNames } from "@/lib/chat";
import { subscribeToUserFamilyChats, type FamilyThread } from "@/lib/familyChat";
import { subscribeToUserGroups } from "@/lib/familyGroups";
import { formatRelativeTime } from "@/lib/time";
import type { FamilyGroup } from "@/lib/types";

type Row =
  | { kind: "doctor"; id: string; name: string; lastMessage?: string; lastMessageAt?: number; unread: number; onPress: () => void }
  | { kind: "family"; id: string; name: string; lastMessage?: string; lastMessageAt?: number; unread: number; onPress: () => void }
  | { kind: "group"; id: string; name: string; memberCount: number; lastMessage?: string; lastMessageAt?: number; onPress: () => void };

export default function Messages() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [doctorThreads, setDoctorThreads] = useState<ThreadWithNames[]>([]);
  const [familyThreads, setFamilyThreads] = useState<FamilyThread[]>([]);
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [newSheetOpen, setNewSheetOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToThreads(user.uid, "patient", setDoctorThreads);
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserFamilyChats(user.uid, setFamilyThreads);
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserGroups(user.uid, setGroups);
  }, [user?.uid]);

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = [];
    for (const t of doctorThreads) {
      all.push({
        kind: "doctor",
        id: t.id,
        name: t.otherName,
        lastMessage: t.lastMessage,
        lastMessageAt: t.lastMessageAt,
        unread: t.unreadForPatient ?? 0,
        onPress: () => router.push(`/(patient)/chat/${t.doctorUid}` as any),
      });
    }
    for (const t of familyThreads) {
      const otherUid = t.participants.find((p) => p !== user?.uid);
      if (!otherUid) continue;
      all.push({
        kind: "family",
        id: t.id,
        name: t.names[otherUid] || "Người thân",
        lastMessage: t.lastMessage,
        lastMessageAt: t.lastMessageAt,
        unread: t.unread[user!.uid] ?? 0,
        onPress: () => router.push(`/(patient)/family-chat/${otherUid}` as any),
      });
    }
    for (const g of groups) {
      all.push({
        kind: "group",
        id: g.id,
        name: g.name,
        memberCount: g.members.length,
        lastMessage: g.lastMessage,
        lastMessageAt: g.lastMessageAt,
        onPress: () => router.push(`/(patient)/family-group/${g.id}` as any),
      });
    }
    return all.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
  }, [doctorThreads, familyThreads, groups, user?.uid]);

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar
          title="Tin nhắn"
          subtitle={`${rows.length} cuộc chat`}
          right={
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setNewSheetOpen(true)}
                hitSlop={8}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: "#5eb594",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ color: "white", fontSize: 18, fontWeight: "700", lineHeight: 20 }}>+</Text>
              </Pressable>
              <UserMenu />
            </View>
          }
        />
        <View className="gap-1.5">
          {rows.map((r) => {
            const unread = "unread" in r ? r.unread : 0;
            const isGroup = r.kind === "group";
            return (
              <Pressable key={`${r.kind}-${r.id}`} onPress={r.onPress}>
                <Card padding="md" variant={unread > 0 ? "soft" : "default"}>
                  <View className="flex-row items-center gap-3">
                    {isGroup ? (
                      <View className="w-10 h-10 rounded-full bg-accent items-center justify-center">
                        <Text style={{ fontSize: 18 }}>👨‍👩‍👧</Text>
                      </View>
                    ) : (
                      <Avatar label={r.name} />
                    )}
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center gap-1.5 flex-1">
                          <Text className={["text-xs text-ink", unread > 0 ? "font-bold" : ""].join(" ")} numberOfLines={1}>
                            {r.name}
                          </Text>
                          {r.kind === "doctor" && (
                            <View className="bg-accent-soft px-1.5 py-0.5 rounded">
                              <Text className="text-[9px] font-bold text-accent-ink">BS</Text>
                            </View>
                          )}
                          {r.kind === "group" && (
                            <Text className="text-[10px] text-ink-3">({(r as any).memberCount} TV)</Text>
                          )}
                        </View>
                        <Text className="text-[10px] text-ink-3">
                          {r.lastMessageAt ? formatRelativeTime(r.lastMessageAt) : ""}
                        </Text>
                      </View>
                      <Text
                        className={["text-[11px] mt-0.5", unread > 0 ? "text-ink font-bold" : "text-ink-3"].join(" ")}
                        numberOfLines={1}
                      >
                        {r.lastMessage ?? (isGroup ? "Nhóm vừa được tạo" : "Chưa có tin nhắn")}
                      </Text>
                    </View>
                    {unread > 0 && (
                      <View className="bg-danger rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center">
                        <Text className="text-[10px] font-bold text-paper">{unread}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          })}
          {rows.length === 0 && (
            <View className="items-center py-10 gap-3">
              <Text className="text-center text-ink-3 text-sm">
                Chưa có cuộc chat nào.
              </Text>
              <Pressable
                onPress={() => setNewSheetOpen(true)}
                className="bg-accent border border-accent-ink rounded-full px-4 py-2"
              >
                <Text className="text-white text-xs font-bold">+ Tạo nhóm hoặc nhắn tin</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <NewChatSheet visible={newSheetOpen} onClose={() => setNewSheetOpen(false)} />
    </SafeAreaView>
  );
}
