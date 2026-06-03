import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Segmented";
import VideoCallModal from "@/components/VideoCallModal";
import { useAuthStore } from "@/hooks/useAuth";
import {
  getOrCreateFamilyThread, sendFamilyMessage,
  subscribeToFamilyMessages, markFamilyThreadRead,
  type FamilyMessage,
} from "@/lib/familyChat";
import { subscribeToUser, isOnline } from "@/lib/users";
import { formatTime } from "@/lib/time";
import type { AppUser } from "@/lib/types";

export default function FamilyChat() {
  const router = useRouter();
  const { uid: otherUid } = useLocalSearchParams<{ uid: string }>();
  const user = useAuthStore((s) => s.user);

  const [other, setOther] = useState<AppUser | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!otherUid) return;
    return subscribeToUser(otherUid, setOther);
  }, [otherUid]);

  useEffect(() => {
    if (!user || !otherUid || !other) return;
    let msgUnsub: (() => void) | undefined;
    let readTimer: ReturnType<typeof setTimeout> | undefined;

    getOrCreateFamilyThread(
      user.uid, user.displayName ?? "Tôi",
      otherUid, other.displayName ?? "Người thân",
    ).then((tid) => {
      setThreadId(tid);
      msgUnsub = subscribeToFamilyMessages(tid, (msgs) => {
        setMessages(msgs);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      });
      readTimer = setTimeout(() => markFamilyThreadRead(tid, user.uid).catch(() => {}), 1500);
    });

    return () => {
      msgUnsub?.();
      clearTimeout(readTimer);
    };
  }, [user?.uid, otherUid, other?.displayName]);

  const send = async () => {
    if (!draft.trim() || !threadId || !user || !otherUid) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    try {
      await sendFamilyMessage(threadId, user.uid, otherUid, text);
    } catch (err) {
      console.error("[family-chat send]", err);
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const displayName = other?.displayName ?? "Người thân";
  const online = isOnline(other);

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
            <View className="flex-row items-center gap-2 flex-1">
              <View>
                <Avatar label={displayName} uri={other?.photoURL ?? undefined} />
                <View
                  style={{
                    position: "absolute",
                    bottom: 0, right: 0,
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: online ? "#22c55e" : "#9ca3af",
                    borderWidth: 1.5, borderColor: "#fafaf7",
                  }}
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-ink" numberOfLines={1}>
                  {displayName}
                </Text>
                <Text className="text-[11px]" style={{ color: online ? "#16a34a" : "#9ca3af" }}>
                  {online ? "● Đang hoạt động" : "○ Ngoại tuyến"}
                </Text>
              </View>
            </View>
          </View>
          <View className="flex-row gap-2 items-center">
            <Pressable
              onPress={() => setCallOpen(true)}
              hitSlop={8}
              disabled={!threadId}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: "#5eb594",
                alignItems: "center", justifyContent: "center",
                opacity: threadId ? 1 : 0.4,
              }}
            >
              <Text style={{ fontSize: 16 }}>📹</Text>
            </Pressable>
            {other?.phone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${other.phone!.replace(/\s/g, "")}`).catch(() => {})}
                hitSlop={8}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: "#dceee4",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 16 }}>📞</Text>
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
          <Text className="text-[10px] text-ink-3 text-center font-mono mt-2">— Hôm nay —</Text>

          {!threadId && (
            <ActivityIndicator size="small" className="mt-4" />
          )}

          {threadId && messages.length === 0 && (
            <Text className="text-[11px] text-ink-3 text-center mt-4">
              Chưa có tin nhắn. Hãy gửi lời chào!
            </Text>
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
                  {isMe ? "Bạn" : displayName} · {formatTime(m.createdAt)}
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
          displayName={user?.displayName ?? "User"}
          onClose={() => setCallOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}
