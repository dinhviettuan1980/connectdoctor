import { useEffect, useMemo, useRef, useState } from "react";
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
import { Audio } from "expo-av";
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
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { ChatMessage } from "@/lib/types";
import VideoCallModal from "@/components/VideoCallModal";
import { STORAGE_URL, resolvePublicStorageUrl } from "@/lib/storage";

async function uploadAudio(uid: string, uri: string): Promise<string> {
  const key = `chat-audio/${uid}/${Date.now()}.m4a`;
  const res = await fetch(uri);
  const blob = await res.blob();
  const form = new FormData();
  form.append("file", blob, `audio_${Date.now()}.m4a`);
  form.append("key", key);
  const up = await fetch(`${STORAGE_URL}/upload`, { method: "POST", body: form });
  if (!up.ok) throw new Error("Audio upload failed");
  const { url } = (await up.json()) as { url: string };
  return resolvePublicStorageUrl(url);
}

function fmtSecs(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function DoctorChatThread() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const user = useAuthStore((s) => s.user);

  const { patientName = "Bệnh nhân" } = useLocalSearchParams<{ patientName?: string }>();

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const patientUids = useMemo(() => (patientId ? [patientId] : []), [patientId]);
  const onlineStatus = useOnlineStatus(patientUids);
  const isPatientOnline = patientId ? onlineStatus[patientId] : false;

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

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

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

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setRecordingSecs(0);
      timerRef.current = setInterval(() => setRecordingSecs((s) => s + 1), 1000);
    } catch (e) {
      console.error("[startRecording]", e);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    clearInterval(timerRef.current);
    setRecordingSecs(0);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      if (uri && threadId && user && patientId) {
        setSending(true);
        try {
          const audioUrl = await uploadAudio(user.uid, uri);
          await sendMessage(threadId, user.uid, patientId, "", undefined, audioUrl);
        } catch (e) {
          console.error("[sendAudio]", e);
        } finally {
          setSending(false);
        }
      }
    } catch (e) {
      console.error("[stopRecording]", e);
      setRecording(null);
    }
  };

  const toggleAudio = async (msgId: string, url: string) => {
    if (playingId === msgId) {
      await soundRef.current?.pauseAsync();
      setPlayingId(null);
      return;
    }
    soundRef.current?.unloadAsync().catch(() => {});
    setPlayingId(msgId);
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setPlayingId(null);
      });
    } catch (e) {
      console.error("[playAudio]", e);
      setPlayingId(null);
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
          <View className="relative">
            <Avatar label={patientName} />
            {isPatientOnline && (
              <View className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-paper" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold text-ink" numberOfLines={1}>
              {patientName}
            </Text>
            <Text className="text-[11px] text-ink-3">
              {isPatientOnline ? "● Đang online" : "Bệnh nhân"}
            </Text>
          </View>
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
                  {m.audioUrl ? (
                    <Pressable
                      onPress={() => toggleAudio(m.id, m.audioUrl!)}
                      className="flex-row items-center gap-2"
                    >
                      <Text className="text-base">
                        {playingId === m.id ? "⏸️" : "▶️"}
                      </Text>
                      <View>
                        <Text className="text-xs font-bold text-ink">Tin nhắn thoại</Text>
                        <Text className="text-[10px] text-ink-3">Nhấn để nghe</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <Text className="text-xs text-ink">{m.text}</Text>
                  )}
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
          {recording ? (
            <View className="flex-1 flex-row items-center gap-2 border border-danger bg-paper rounded-full px-3 py-1.5">
              <View className="w-2 h-2 rounded-full bg-danger" />
              <Text className="text-xs font-mono text-danger flex-1">{fmtSecs(recordingSecs)} đang ghi…</Text>
              <Pressable onPress={stopRecording} hitSlop={8}>
                <Text className="text-xs text-ink-3">Hủy</Text>
              </Pressable>
            </View>
          ) : (
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
          )}

          {recording ? (
            <Pressable
              onPress={stopRecording}
              disabled={sending}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: "#c3604a",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 14 }}>⬛</Text>
            </Pressable>
          ) : draft.trim() ? (
            <Button variant="primary" size="sm" onPress={send} disabled={sending || !threadId}>
              {sending ? "…" : "↑"}
            </Button>
          ) : (
            <Pressable
              onPress={startRecording}
              disabled={!threadId || sending}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: "#dceee4",
                alignItems: "center", justifyContent: "center",
                opacity: (!threadId || sending) ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 16 }}>🎤</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}
