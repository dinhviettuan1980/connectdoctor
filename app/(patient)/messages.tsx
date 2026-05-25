import { useEffect, useState } from "react";
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

export default function Messages() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [threads, setThreads] = useState<ThreadWithNames[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToThreads(user.uid, "patient", setThreads);
    return unsub;
  }, [user?.uid]);

  const unreadCount = (t: ThreadWithNames) => t.unreadForPatient ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar title="Tin nhắn" subtitle={`${threads.length} cuộc chat`} right={<UserMenu />} />
        <View className="gap-1.5">
          {threads.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push(`/(patient)/chat/${t.doctorUid}`)}
            >
              <Card padding="md" variant={unreadCount(t) > 0 ? "soft" : "default"}>
                <View className="flex-row items-center gap-3">
                  <Avatar label={t.otherName} />
                  <View className="flex-1">
                    <View className="flex-row justify-between items-center">
                      <Text className={["text-xs text-ink", unreadCount(t) > 0 ? "font-bold" : ""].join(" ")}>
                        {t.otherName}
                      </Text>
                      <Text className="text-[10px] text-ink-3">
                        {t.lastMessageAt ? formatRelativeTime(t.lastMessageAt) : ""}
                      </Text>
                    </View>
                    <Text
                      className={["text-[11px] mt-0.5 numberOfLines-1", unreadCount(t) > 0 ? "text-ink font-bold" : "text-ink-3"].join(" ")}
                      numberOfLines={1}
                    >
                      {t.lastMessage ?? ""}
                    </Text>
                  </View>
                  {unreadCount(t) > 0 && (
                    <View className="bg-danger rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center">
                      <Text className="text-[10px] font-bold text-paper">{unreadCount(t)}</Text>
                    </View>
                  )}
                </View>
              </Card>
            </Pressable>
          ))}
          {threads.length === 0 && (
            <Text className="text-center text-ink-3 text-sm py-12">
              Chưa có cuộc chat nào.{"\n"}Tìm bác sĩ qua tính năng AI để bắt đầu.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
