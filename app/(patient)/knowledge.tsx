import { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, GestureResponderEvent, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/hooks/useAuth";
import { AppBar } from "@/components/AppBar";
import { Chip } from "@/components/ui/Chip";
import { UserMenu } from "@/components/UserMenu";

const STORAGE_URL = process.env.EXPO_PUBLIC_STORAGE_URL ?? "https://api.tuandv.id.vn/storage";
const CACHE_DIR = FileSystem.documentDirectory ? FileSystem.documentDirectory + "knowledge/" : null;

type Track = {
  file: string;
  title: string;
  duration: string;
  durationMs: number;
  category: string;
};

const TRACKS: Track[] = [
  { file: "01-82Slgsm5gbo.m4a",  title: "Forest Rain – Deep Calm",                    duration: "36:32",   durationMs: 2192000, category: "Thiên nhiên" },
  { file: "02-TyfnDC3rB18.m4a",  title: "Bamboo Spa Waterfall – Flute & Water",        duration: "30:23",   durationMs: 1823000, category: "Thiền định"  },
  { file: "03-2EJyolgXLJk.m4a",  title: "Relaxing Shore Waves – Ocean Sound",          duration: "34:52",   durationMs: 2092000, category: "Thiên nhiên" },
  { file: "04-leS4-56Bhbw.m4a",  title: "Bamboo Waterfall Meditation – Yoga",          duration: "1:00:18", durationMs: 3618000, category: "Thiền định"  },
  { file: "05-Oa7xfcM5oYA.m4a",  title: "Ocean Sounds Miami Sunset – Waves & Music",  duration: "1:00:24", durationMs: 3624000, category: "Thiên nhiên" },
  { file: "06-e4rf194D1Lg.m4a",  title: "Deep Calm Waterfall Maui – Nature Sounds",   duration: "30:30",   durationMs: 1830000, category: "Thiên nhiên" },
  { file: "07-41jKm1O7rjA.m4a",  title: "Temple of Serenity – Energy Purification",   duration: "1:00:16", durationMs: 3616000, category: "Thiền định"  },
  { file: "08-afkmHNL4oN0.m4a",  title: "Bali Rain & Rice Fields – Tropical Rain",    duration: "30:01",   durationMs: 1801000, category: "Thiên nhiên" },
  { file: "09-CV75gKADd4s.m4a",  title: "Mount Rainier – Evening Wave Sounds",        duration: "10:45",   durationMs: 645000,  category: "Thiên nhiên" },
  { file: "10-uAEnUopnf_s.m4a",  title: "Smooth Jazz Waterfall – Romantic Relaxation",duration: "33:28",   durationMs: 2008000, category: "Âm nhạc"     },
  { file: "11-C9yRVMAHbiw.m4a",  title: "Beautiful Flute Meditation – Positive Calm", duration: "1:00:16", durationMs: 3616000, category: "Âm nhạc"     },
  { file: "12-R8hm8QFjGzo.m4a",  title: "Cozy Rain Sounds – Rest & Meditation",       duration: "30:56",   durationMs: 1856000, category: "Thiên nhiên" },
  { file: "13-Gd0tedV1xkY.m4a",  title: "Moonlit Lotus – Restorative Yoga",           duration: "1:00:16", durationMs: 3616000, category: "Thiền định"  },
  { file: "14-h_0VH7veSbw.m4a",  title: "Pure Ocean Sounds – Calm & Meditation",      duration: "30:17",   durationMs: 1817000, category: "Thiên nhiên" },
  { file: "15-IxgSNnbR1Zg.m4a",  title: "Moonlit Waterfall – Yoga & Better Sleep",    duration: "1:00:17", durationMs: 3617000, category: "Thiền định"  },
];

const CATEGORIES = ["Nhạc của tôi", "Tất cả"];
const CAT_EMOJI: Record<string, string> = {
  "Thiên nhiên": "🌿",
  "Thiền định": "🧘",
  "Âm nhạc": "🎵",
  "Nhạc của tôi": "❤️",
};

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function localPath(file: string) {
  return CACHE_DIR ? CACHE_DIR + file : null;
}

async function ensureCacheDir() {
  if (!CACHE_DIR) return;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
}

async function isCached(file: string): Promise<boolean> {
  const path = localPath(file);
  if (!path) return false;
  const info = await FileSystem.getInfoAsync(path);
  return info.exists && (info as any).size > 0;
}

export default function Knowledge() {
  const user = useAuthStore((s) => s.user);
  const [cat, setCat] = useState("Nhạc của tôi");
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const barRef = useRef<View>(null);
  const barWidthRef = useRef(1);

  // Offline cache state: set of cached file names
  const [cached, setCached] = useState<Set<string>>(new Set());
  // Downloading state: set of file names being downloaded
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  // My album: set of file names saved by user
  const [myAlbum, setMyAlbum] = useState<Set<string>>(new Set());
  const [albumLoading, setAlbumLoading] = useState(false);

  // Load cached files on mount
  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      await ensureCacheDir();
      const results = await Promise.all(TRACKS.map((t) => isCached(t.file).then((ok) => ok ? t.file : null)));
      setCached(new Set(results.filter(Boolean) as string[]));
    })();
  }, []);

  // Load my album from Firestore
  useEffect(() => {
    if (!user) return;
    setAlbumLoading(true);
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        const data = snap.data();
        const album: string[] = data?.knowledgeAlbum ?? [];
        setMyAlbum(new Set(album));
      })
      .finally(() => setAlbumLoading(false));
  }, [user?.uid]);

  const saveAlbum = useCallback(async (newSet: Set<string>) => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), { knowledgeAlbum: [...newSet] }, { merge: true });
  }, [user]);

  const toggleAlbum = async (file: string) => {
    const next = new Set(myAlbum);
    if (next.has(file)) next.delete(file);
    else next.add(file);
    setMyAlbum(next);
    await saveAlbum(next);
  };

  const downloadTrack = async (track: Track) => {
    const path = localPath(track.file);
    if (!path || Platform.OS === "web") return;
    setDownloading((prev) => new Set([...prev, track.file]));
    try {
      await ensureCacheDir();
      await FileSystem.downloadAsync(
        `${STORAGE_URL}/files/knowledge/${track.file}`,
        path,
      );
      setCached((prev) => new Set([...prev, track.file]));
    } catch (e) {
      console.error("[download]", e);
    } finally {
      setDownloading((prev) => { const s = new Set(prev); s.delete(track.file); return s; });
    }
  };

  const trackUri = (track: Track): string => {
    const path = localPath(track.file);
    if (path && cached.has(track.file)) return path;
    return `${STORAGE_URL}/files/knowledge/${track.file}`;
  };

  const playTrack = async (track: Track) => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setCurrentTrack(track);
    setLoading(true);
    setPosition(0);
    setDuration(0);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: trackUri(track) },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setPosition(status.positionMillis ?? 0);
          setDuration(status.durationMillis ?? 0);
          setPlaying(status.isPlaying);
          if (status.didJustFinish) {
            const idx = TRACKS.indexOf(track);
            if (idx < TRACKS.length - 1) playTrack(TRACKS[idx + 1]);
            else setPlaying(false);
          }
        }
      );
      soundRef.current = sound;
      setPlaying(true);
    } catch (e) {
      console.error("[knowledge play]", e);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = async () => {
    if (!soundRef.current) return;
    if (playing) await soundRef.current.pauseAsync();
    else await soundRef.current.playAsync();
  };

  const skipNext = () => {
    if (!currentTrack) return;
    const idx = TRACKS.indexOf(currentTrack);
    if (idx < TRACKS.length - 1) playTrack(TRACKS[idx + 1]);
  };

  const skipPrev = () => {
    if (!currentTrack) return;
    if (position > 3000) soundRef.current?.setPositionAsync(0);
    else {
      const idx = TRACKS.indexOf(currentTrack);
      if (idx > 0) playTrack(TRACKS[idx - 1]);
    }
  };

  const seekBy = (deltaMs: number) => {
    if (!soundRef.current || duration === 0) return;
    soundRef.current.setPositionAsync(Math.max(0, Math.min(duration, position + deltaMs)));
  };

  const seekToTap = (e: GestureResponderEvent) => {
    if (!soundRef.current || duration === 0) return;
    const pageX = e.nativeEvent.pageX;
    barRef.current?.measure((_x, _y, width, _h, barPageX) => {
      const localX = pageX - barPageX;
      if (!Number.isFinite(localX) || width <= 0) return;
      soundRef.current?.setPositionAsync(Math.max(0, Math.min(1, localX / width)) * duration);
    });
  };

  useEffect(() => () => { soundRef.current?.unloadAsync(); }, []);

  const filtered =
    cat === "Nhạc của tôi"
      ? TRACKS.filter((t) => myAlbum.has(t.file))
      : cat === "Tất cả"
      ? TRACKS
      : TRACKS.filter((t) => t.category === cat);

  const progress = duration > 0 ? position / duration : 0;
  const displayDuration = duration > 0 ? duration : (currentTrack?.durationMs ?? 0);
  const isNative = Platform.OS !== "web";

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: currentTrack ? 100 : 16 }}>
        <AppBar title="Thư giãn & Thiền định" subtitle={`${TRACKS.length} bản nhạc`} right={<UserMenu />} />

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -16 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: "row" }}
        >
          {CATEGORIES.map((c) => (
            <Chip key={c} variant={cat === c ? "accent" : "default"} onPress={() => setCat(c)}>
              {CAT_EMOJI[c] ? `${CAT_EMOJI[c]} ${c}` : c}
            </Chip>
          ))}
        </ScrollView>

        {/* Empty state for My Album */}
        {cat === "Nhạc của tôi" && !albumLoading && filtered.length === 0 && (
          <View className="items-center py-12 gap-2">
            <Text className="text-3xl">❤️</Text>
            <Text className="text-sm text-ink-3 text-center">
              Chưa có bài nào.{"\n"}Bấm ❤️ trên bài nhạc để thêm vào đây.
            </Text>
          </View>
        )}

        {/* Track list */}
        <View>
          {filtered.map((track) => {
            const isActive = currentTrack?.file === track.file;
            const trackNum = TRACKS.indexOf(track) + 1;
            const isCachedFile = cached.has(track.file);
            const isDownloading = downloading.has(track.file);
            const inAlbum = myAlbum.has(track.file);

            return (
              <Pressable
                key={track.file}
                onPress={() => (isActive ? togglePlay() : playTrack(track))}
              >
                <View
                  className={[
                    "flex-row items-center gap-3 py-3 px-1 border-b border-dashed",
                    isActive ? "border-accent-ink" : "border-line-soft",
                  ].join(" ")}
                >
                  {/* Play / track number indicator */}
                  <View
                    className={[
                      "w-9 h-9 rounded-full items-center justify-center",
                      isActive ? "bg-accent" : "border border-line-soft bg-paper-2",
                    ].join(" ")}
                  >
                    {isActive && loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        className={[
                          "font-bold",
                          isActive ? "text-paper text-base" : "text-ink-3 text-xs",
                        ].join(" ")}
                      >
                        {isActive ? (playing ? "⏸" : "▶") : `${trackNum}`}
                      </Text>
                    )}
                  </View>

                  {/* Title + category */}
                  <View className="flex-1">
                    <Text
                      className={["text-xs", isActive ? "font-bold text-ink" : "text-ink"].join(" ")}
                      numberOfLines={1}
                    >
                      {track.title}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Text className="text-[10px]">{CAT_EMOJI[track.category]}</Text>
                      <Text className="text-[10px] text-ink-3">{track.category}</Text>
                      {isCachedFile && isNative && (
                        <Text className="text-[10px] text-accent-ink ml-1">● offline</Text>
                      )}
                    </View>
                  </View>

                  {/* Duration */}
                  <Text className="font-mono text-[10px] text-ink-3 mr-1">{track.duration}</Text>

                  {/* Add to album */}
                  <Pressable
                    onPress={() => toggleAlbum(track.file)}
                    hitSlop={8}
                    className="w-8 h-8 items-center justify-center"
                  >
                    <Text className="text-base">{inAlbum ? "❤️" : "🤍"}</Text>
                  </Pressable>

                  {/* Download (native only, hide if cached) */}
                  {isNative && !isCachedFile && (
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); downloadTrack(track); }}
                      hitSlop={8}
                      className="w-8 h-8 items-center justify-center"
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="#5eb594" />
                      ) : (
                        <Text className="text-base text-ink-3">⬇</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Mini player bar ── */}
      {currentTrack && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-paper border-t border-line"
          style={{ paddingBottom: 18 }}
        >
          <Pressable
            ref={barRef}
            onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
            onPress={seekToTap}
            style={{ height: 20, justifyContent: "center" }}
          >
            <View style={{ height: 3, backgroundColor: "#f1f0ea" }}>
              <View style={{ height: 3, backgroundColor: "#5eb594", width: `${(progress * 100).toFixed(1)}%` as any }} />
            </View>
            <View
              style={{
                position: "absolute",
                left: `${(progress * 100).toFixed(1)}%` as any,
                width: 12, height: 12, borderRadius: 6,
                backgroundColor: "#5eb594", marginLeft: -6, top: 4,
              }}
            />
          </Pressable>

          <View className="flex-row items-center px-4 pt-1 gap-3">
            <View className="flex-1">
              <Text className="text-xs font-bold text-ink" numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="font-mono text-[10px] text-ink-3 mt-0.5">
                  {fmtMs(position)} / {fmtMs(displayDuration)}
                </Text>
                {isNative && cached.has(currentTrack.file) && (
                  <Text className="text-[10px] text-accent-ink">offline</Text>
                )}
              </View>
            </View>

            <View className="flex-row items-center gap-4">
              <Pressable onPress={skipPrev} hitSlop={10}>
                <Text className="text-xl text-ink-2">⏮</Text>
              </Pressable>
              <Pressable onPress={() => seekBy(-15000)} hitSlop={10}>
                <Text className="text-sm font-bold text-ink-2">-15</Text>
              </Pressable>
              <Pressable
                onPress={togglePlay}
                className="w-11 h-11 rounded-full bg-accent items-center justify-center"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-paper text-xl" style={{ marginLeft: playing ? 0 : 2 }}>
                    {playing ? "⏸" : "▶"}
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={() => seekBy(15000)} hitSlop={10}>
                <Text className="text-sm font-bold text-ink-2">+15</Text>
              </Pressable>
              <Pressable onPress={skipNext} hitSlop={10}>
                <Text className="text-xl text-ink-2">⏭</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
