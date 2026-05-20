import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Segmented";
import { getMockDoctor } from "@/lib/mockDoctors";
import { openEmail, openPhone } from "@/lib/linking";
import { useAuthStore } from "@/hooks/useAuth";
import {
  getOrCreateThread,
  sendMessage,
  subscribeToMessages,
  markThreadRead,
} from "@/lib/chat";
import { formatTime } from "@/lib/time";
import type { ChatMessage } from "@/lib/types";

export default function ChatThread() {
  const router = useRouter();
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const user = useAuthStore((s) => s.user);
  const d = getMockDoctor(doctorId ?? "");

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Get or create thread, then subscribe to messages
  useEffect(() => {
    if (!user || !doctorId) return;
    let msgUnsub: (() => void) | undefined;

    getOrCreateThread(user.uid, doctorId, {
      patientName: user.displayName ?? "Bệnh nhân",
      doctorName: d.fullName,
    }).then((tid) => {
      setThreadId(tid);
      msgUnsub = subscribeToMessages(tid, (msgs) => {
        setMessages(msgs);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      });
      markThreadRead(tid, "patient").catch(() => {});
    });

    return () => msgUnsub?.();
  }, [user?.uid, doctorId]);

  const send = async () => {
    if (!draft.trim() || !threadId || !user) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    try {
      await sendMessage(threadId, user.uid, doctorId ?? "", text);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="px-4 pt-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <Pressable
              onPress={() => router.back()}
              className="w-7 h-7 items-center justify-center"
            >
              <Text className="text-xl text-ink-2">‹</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/(patient)/chat/doctor/${d.uid}`)}
              className="flex-row items-center gap-2 flex-1"
            >
              <Avatar label={d.fullName} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-ink" numberOfLines={1}>
                  {d.fullName}
                </Text>
                <Text className="text-[11px] text-ink-3">● online · {d.specialty}</Text>
              </View>
            </Pressable>
          </View>
          <View className="flex-row gap-3">
            {d.email && (
              <Pressable
                onPress={() => openEmail(d.email!, "Tin nhắn từ ConnectDoctor")}
                hitSlop={8}
              >
                <Text className="text-base">✉</Text>
              </Pressable>
            )}
            {d.phone && (
              <Pressable onPress={() => openPhone(d.phone!)} hitSlop={8}>
                <Text className="text-base">📞</Text>
              </Pressable>
            )}
          </View>
        </View>
        <Divider />

        {/* Message list */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Doctor intro card */}
          <Pressable onPress={() => router.push(`/(patient)/chat/doctor/${d.uid}`)}>
            <Card variant="soft" padding="md">
              <View className="flex-row items-center gap-3">
                <Avatar label={d.fullName} size="lg" />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-ink">{d.fullName}</Text>
                  <Text className="text-[11px] text-ink-3">
                    {d.degree} · {d.workplace}
                  </Text>
                  <View className="flex-row gap-1.5 mt-1">
                    {d.verified && <Chip variant="accent">✓ Xác minh</Chip>}
                    {d.yearsExperience && <Chip variant="soft">{d.yearsExperience}n KN</Chip>}
                  </View>
                </View>
                <Text className="text-base text-ink-3">›</Text>
              </View>
            </Card>
          </Pressable>

          <Text className="text-[10px] text-ink-3 text-center font-mono mt-2">— Hôm nay —</Text>

          {!threadId && (
            <ActivityIndicator size="small" className="mt-4" />
          )}

          {messages.map((m) => {
            const isMe = m.fromUid === user?.uid;
            return (
              <View
                key={m.id}
                style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "85%" }}
              >
                <View
                  className={[
                    "px-3 py-2 border rounded-2xl",
                    isMe
                      ? "bg-accent-soft border-accent-ink rounded-br-sm"
                      : "bg-paper border-line rounded-bl-sm",
                  ].join(" ")}
                >
                  <Text className="text-xs text-ink">{m.text}</Text>
                </View>
                <Text
                  className="text-[10px] text-ink-3 mt-0.5"
                  style={{ textAlign: isMe ? "right" : "left" }}
                >
                  {isMe ? "Bạn" : "BS"} · {formatTime(m.createdAt)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Input bar */}
        <View className="flex-row items-center gap-2 px-3 py-2 border-t border-line">
          <Pressable hitSlop={8}>
            <Text className="text-lg">📷</Text>
          </Pressable>
          <View className="flex-1 border border-line bg-paper rounded-full px-3 py-1.5">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Nhập tin nhắn…"
              placeholderTextColor="#b5b5b5"
              className="text-sm text-ink"
              onSubmitEditing={send}
              returnKeyType="send"
              editable={!!threadId && !sending}
            />
          </View>
          <Button variant="primary" size="sm" onPress={send} disabled={sending || !threadId}>
            {sending ? "…" : "↑"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
