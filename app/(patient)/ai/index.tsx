import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/Note";
import { startTriage } from "@/lib/ai";
import type { AiQuestion } from "@/lib/types";

export default function AiQuestionFlow() {
  const router = useRouter();
  const { complaint } = useLocalSearchParams<{ complaint: string }>();
  const [questions, setQuestions] = useState<AiQuestion[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    (async () => {
      try {
        const r = await startTriage(complaint ?? "");
        setQuestions(r.questions);
        setSpecialties(r.specialties);
        setConditions(r.conditions);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [complaint]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-paper items-center justify-center">
        <ActivityIndicator />
        <Text className="text-xs text-ink-3 mt-3">Trợ lý đang phân tích…</Text>
      </SafeAreaView>
    );
  }

  if (error || questions.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-paper items-center justify-center px-8">
        <Text className="text-base font-bold text-ink text-center">Không thể kết nối AI</Text>
        <Text className="text-sm text-ink-3 text-center mt-2">
          Vui lòng kiểm tra kết nối mạng và thử lại.
        </Text>
        <Button variant="primary" size="md" onPress={() => router.back()} block>
          ← Quay lại
        </Button>
      </SafeAreaView>
    );
  }

  const q = questions[step];
  const total = questions.length;
  const progress = (step + 1) / total;

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else
      router.replace({
        pathname: "/(patient)/ai/result",
        params: {
          complaint: complaint ?? "",
          specialties: specialties.join(","),
          conditions: conditions.join(","),
        },
      });
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar
          title="Trợ lý AI"
          subtitle={`Câu ${step + 1} / ${total}`}
          back
          right={
            <Pressable onPress={next}>
              <Text className="text-xs underline text-ink-3">Bỏ qua</Text>
            </Pressable>
          }
        />

        <View className="h-1 bg-line-soft rounded overflow-hidden">
          <View
            className="h-full bg-accent-ink"
            style={{ width: `${progress * 100}%` }}
          />
        </View>

        <Card variant="soft" padding="sm">
          <Text className="text-[10px] uppercase tracking-wider text-ink-3">BẠN VỪA NHẬP</Text>
          <Text className="text-xs text-ink mt-0.5" numberOfLines={2}>
            "{complaint}"
          </Text>
        </Card>

        <Text className="text-base font-bold text-ink mt-1">{q.prompt}</Text>

        <View className="gap-2">
          {q.options.map((opt) => {
            const selected = answers[step] === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setAnswers({ ...answers, [step]: opt })}
              >
                <Card variant={selected ? "accent" : "default"} padding="md">
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className={[
                        "w-3.5 h-3.5 rounded-full border",
                        selected ? "border-accent-ink bg-accent-ink" : "border-ink-2",
                      ].join(" ")}
                    />
                    <Text className="text-xs text-ink flex-1">{opt}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <Note>AI hỏi tối đa 4–5 câu rồi gợi ý chuyên khoa phù hợp.</Note>

        <View className="flex-row gap-2 mt-4">
          <Button block onPress={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            ← Trước
          </Button>
          <Button variant="primary" block onPress={next} disabled={!answers[step]}>
            {step < total - 1 ? "Tiếp →" : "Xem kết quả →"}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
