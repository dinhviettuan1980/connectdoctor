import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { AppBar } from "@/components/AppBar";
import { Chip } from "@/components/ui/Chip";

const STORAGE_URL = process.env.EXPO_PUBLIC_STORAGE_URL ?? "https://api.tuandv.id.vn/storage";

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

const CATEGORIES = ["Tất cả", "Thiên nhiên", "Thiền định", "Âm nhạc"];
const CAT_EMOJI: Record<string, string> = {
  "Thiên nhiên": "🌿",
  "Thiền định": "🧘",
  "Âm nhạc": "🎵",
};

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function Knowledge() {
  const [cat, setCat] = useState("Tất cả");
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const filtered = cat === "Tất cả" ? TRACKS : TRACKS.filter((t) => t.category === cat);

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
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: `${STORAGE_URL}/files/knowledge/${track.file}` },
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
    if (position > 3000) {
      soundRef.current?.setPositionAsync(0);
    } else {
      const idx = TRACKS.indexOf(currentTrack);
      if (idx > 0) playTrack(TRACKS[idx - 1]);
    }
  };

  useEffect(() => () => { soundRef.current?.unloadAsync(); }, []);

  const progress = duration > 0 ? position / duration : 0;
  const displayDuration = duration > 0 ? duration : (currentTrack?.durationMs ?? 0);

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: currentTrack ? 100 : 16 }}>
        <AppBar title="Thư giãn & Thiền định" subtitle={`${TRACKS.length} bản nhạc`} />

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

        {/* Track list */}
        <View>
          {filtered.map((track) => {
            const isActive = currentTrack?.file === track.file;
            const trackNum = TRACKS.indexOf(track) + 1;
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
                    </View>
                  </View>

                  {/* Duration */}
                  <Text className="font-mono text-[10px] text-ink-3">{track.duration}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Mini player bar ──────────────────────────────────────────────────── */}
      {currentTrack && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-paper border-t border-line"
          style={{ paddingBottom: 18 }}
        >
          {/* Progress bar */}
          <View style={{ height: 3, backgroundColor: "#f1f0ea" }}>
            <View
              style={{
                height: 3,
                backgroundColor: "#5eb594",
                width: `${(progress * 100).toFixed(1)}%`,
              }}
            />
          </View>

          <View className="flex-row items-center px-4 pt-3 gap-3">
            {/* Track info */}
            <View className="flex-1">
              <Text className="text-xs font-bold text-ink" numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text className="font-mono text-[10px] text-ink-3 mt-0.5">
                {fmtMs(position)} / {fmtMs(displayDuration)}
              </Text>
            </View>

            {/* Controls */}
            <View className="flex-row items-center gap-5">
              <Pressable onPress={skipPrev} hitSlop={10}>
                <Text className="text-xl text-ink-2">⏮</Text>
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
