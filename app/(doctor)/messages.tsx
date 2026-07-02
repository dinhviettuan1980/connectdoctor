import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { UserMenu } from "@/components/UserMenu";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/hooks/useAuth";
import { subscribeToThreads, type ThreadWithNames } from "@/lib/chat";
import { formatRelativeTime } from "@/lib/time";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function DoctorMessages() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [threads, setThreads] = useState<ThreadWithNames[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToThreads(user.uid, "doctor", setThreads);
    return unsub;
  }, [user?.uid]);

  const patientUids = useMemo(() => threads.map((t) => t.patientUid), [threads]);
  const onlineStatus = useOnlineStatus(patientUids);

  const unreadCount = (t: ThreadWithNames) => t.unreadForDoctor ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title="Tin nhắn" subtitle={`${threads.length} cuộc chat`} right={<UserMenu />} />
        <View className="gap-1.5">
          {threads.map((t) => {
            const online = onlineStatus[t.patientUid];
            return (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/(doctor)/chat/${t.patientUid}`)}
              >
                <Card padding="md">
                  <View className="flex-row items-center gap-3">
                    <View className="relative">
                      <Avatar label={t.otherName} />
                      {online && (
                        <View className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-paper" />
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-xs font-bold text-ink">{t.otherName}</Text>
                          {online && (
                            <View className="bg-accent-soft px-1.5 py-0.5 rounded">
                              <Text className="text-[9px] font-bold text-accent-ink">Online</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[10px] text-ink-3">
                          {t.lastMessageAt ? formatRelativeTime(t.lastMessageAt) : ""}
                        </Text>
                      </View>
                      <Text className="text-[11px] text-ink-3 mt-0.5" numberOfLines={1}>
                        {t.lastMessage ?? ""}
                      </Text>
                    </View>
                    {unreadCount(t) > 0 && (
                      <View className="bg-accent-ink rounded-full w-5 h-5 items-center justify-center">
                        <Text className="text-[10px] font-bold text-paper">{unreadCount(t)}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          })}
          {threads.length === 0 && (
            <Text className="text-center text-ink-3 text-sm py-12">
              Chưa có cuộc chat nào.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
