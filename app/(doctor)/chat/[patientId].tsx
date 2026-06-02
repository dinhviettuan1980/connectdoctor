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
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Segmented";
import { useAuthStore } from "@/hooks/useAuth";
import {
  getOrCreateThread,
  sendMessage,
  subscribeToMessages,
  markThreadRead,
} from "@/lib/chat";
import { formatTime } from "@/lib/time";
import type { ChatMessage } from "@/lib/types";
import VideoCallModal from "@/components/VideoCallModal";

export default function DoctorChatThread() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const user = useAuthStore((s) => s.user);

  // patientName can be passed as a route param (from messages list) or fetched from Firestore.
  // Using patientId as fallback label for the avatar.
  const { patientName = "Bệnh nhân" } = useLocalSearchParams<{ patientName?: string }>();

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user || !patientId) return;
    let msgUnsub: (() => void) | undefined;

    getOrCreateThread(patientId, user.uid, {
      patientName,
      doctorName: user.displayName ?? "Bác sĩ",
    }).then((tid) => {
      setThreadId(tid);
      msgUnsub = subscribeToMessages(tid, (msgs) => {
        setMessages(msgs);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      });
      markThreadRead(tid, "doctor").catch(() => {});
    });

    return () => msgUnsub?.();
  }, [user?.uid, patientId]);

  const send = async () => {
    if (!draft.trim() || !threadId || !user || !patientId) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    try {
      await sendMessage(threadId, user.uid, patientId, text);
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
        <View className="px-4 pt-2 flex-row items-center gap-2">
          <Pressable
            onPress={() => router.back()}
            className="w-7 h-7 items-center justify-center"
          >
            <Text className="text-xl text-ink-2">‹</Text>
          </Pressable>
          <Avatar label={patientName} />
          <View className="flex-1">
            <Text className="text-xs font-bold text-ink" numberOfLines={1}>
              {patientName}
            </Text>
            <Text className="text-[11px] text-ink-3">Bệnh nhân</Text>
          </View>
          <Pressable onPress={() => setCallOpen(true)} hitSlop={8} disabled={!threadId} style={{ opacity: threadId ? 1 : 0.4, paddingHorizontal: 4 }}>
            <Text className="text-base">📹</Text>
          </Pressable>
        </View>
        <Divider />

        {/* Message list */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <Text className="text-[10px] text-ink-3 text-center font-mono mb-2">— Hôm nay —</Text>

          {!threadId && <ActivityIndicator size="small" />}

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
                  {isMe ? "Bạn" : patientName} · {formatTime(m.createdAt)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Input bar */}
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
              editable={!!threadId && !sending}
            />
          </View>
          <Button variant="primary" size="sm" onPress={send} disabled={sending || !threadId}>
            {sending ? "…" : "↑"}
          </Button>
        </View>
      </KeyboardAvoidingView>

      {threadId && (
        <VideoCallModal
          visible={callOpen}
          room={`connectdoctor-${threadId}`}
          displayName={user?.displayName ?? "Bác sĩ"}
          onClose={() => setCallOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}
