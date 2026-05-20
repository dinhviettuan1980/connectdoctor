import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppBar } from "@/components/AppBar";
import { TopTabs } from "@/components/TopTabs";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Section, Segmented } from "@/components/ui/Segmented";
import { MetricChart } from "@/components/MetricChart";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/lib/auth";

const TABS = [
  { key: "info", label: "Thông tin" },
  { key: "meds", label: "Thuốc" },
  { key: "metrics", label: "Chỉ số" },
];

export default function PatientProfile() {
  const router = useRouter();
  const [tab, setTab] = useState("info");

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="px-4 pt-2 gap-2">
        <AppBar
          title="Hồ sơ"
          subtitle="Bệnh nhân"
          right={
            <Pressable onPress={signOut}>
              <Text className="text-xs underline text-ink-3">Đăng xuất</Text>
            </Pressable>
          }
        />
        <TopTabs tabs={TABS} active={tab} onChange={setTab} />
      </View>
      {tab === "info" && <InfoTab />}
      {tab === "meds" && <MedsTab onAdd={() => router.push("/(patient)/ocr/upload?kind=meds")} />}
      {tab === "metrics" && <MetricsTab onAdd={() => router.push("/(patient)/ocr/upload?kind=metrics")} />}
    </SafeAreaView>
  );
}

function InfoTab() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card variant="accent" padding="md">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="font-bold text-ink">Nguyễn Văn A</Text>
            <Text className="text-[11px] text-ink-3">Nam · 33 tuổi</Text>
          </View>
          <View className="items-end">
            <Text className="font-mono font-bold text-base text-ink">23.0</Text>
            <Text className="text-[10px] text-ink-3">BMI · bình thường</Text>
          </View>
        </View>
      </Card>

      <View className="flex-row gap-2">
        <View className="flex-1"><Input label="Chiều cao" value="172 cm" /></View>
        <View className="flex-1"><Input label="Cân nặng" value="68 kg" /></View>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1"><Input label="Năm sinh" value="1992" /></View>
        <View className="flex-1"><Input label="Nhóm máu" value="O+" /></View>
      </View>

      <Section title="Bệnh nền" action={<Text className="text-[11px] underline text-ink">+ Thêm</Text>}>
        <View className="flex-row flex-wrap gap-1.5">
          <Chip>Tăng huyết áp</Chip>
          <Chip>Tiểu đường II</Chip>
          <Chip variant="soft">+</Chip>
        </View>
      </Section>

      <Section title="Dị ứng">
        <View className="flex-row flex-wrap gap-1.5">
          <Chip>Penicillin</Chip>
          <Chip>Tôm cua</Chip>
          <Chip variant="soft">+</Chip>
        </View>
      </Section>
    </ScrollView>
  );
}

function MedsTab({ onAdd }: { onAdd: () => void }) {
  const [view, setView] = useState<"current" | "history">("current");
  const meds = [
    ["Amlodipin 5mg", "1 viên / sáng", "Huyết áp"],
    ["Metformin 500mg", "2 viên × 2 / ngày", "Tiểu đường"],
    ["Atorvastatin 20mg", "1 viên / tối", "Mỡ máu"],
    ["Vitamin D3", "1 giọt / sáng", "Bổ sung"],
    ["Aspirin 81mg", "1 viên / sáng", "Tim mạch"],
  ];
  const history = [
    ["12/05/2026", "5 thuốc · sửa", true],
    ["28/04/2026", "4 thuốc", false],
    ["10/03/2026", "6 thuốc (OCR)", false],
    ["02/02/2026", "3 thuốc", false],
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View className="flex-row gap-2">
        <Button block leftIcon={<Text>＋</Text>}>Nhập tay</Button>
        <Button variant="primary" block leftIcon={<Text>📷</Text>} onPress={onAdd}>
          Từ ảnh
        </Button>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] text-ink-3">{meds.length} thuốc · bản ghi #12</Text>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "current", label: "Mới nhất" },
            { value: "history", label: "Lịch sử" },
          ]}
        />
      </View>

      {view === "current" && (
        <View className="gap-1.5">
          {meds.map(([name, dose, tag]) => (
            <Card key={name as string} padding="md">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-ink">{name}</Text>
                  <Text className="text-[11px] text-ink-3">{dose}</Text>
                </View>
                <Chip variant="soft">{tag}</Chip>
              </View>
            </Card>
          ))}
        </View>
      )}

      {view === "history" && (
        <View className="gap-1.5">
          {history.map(([d, c, cur]) => (
            <Card key={d as string} padding="sm">
              <View className="flex-row items-center justify-between">
                <Text className="font-mono text-[11px] font-bold text-ink">{d as string}</Text>
                <Text className="text-[11px] text-ink-2">{c as string}</Text>
                {cur ? <Chip variant="accent">hiện tại</Chip> : <Text className="text-xs text-ink-3">›</Text>}
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function MetricsTab({ onAdd }: { onAdd: () => void }) {
  const [chart, setChart] = useState(true);
  const log = [
    ["18/05 · 07:20", "124/80", "sáng"],
    ["16/05 · 21:10", "132/86", "tối"],
    ["15/05 · 08:00", "128/82", "sáng"],
    ["12/05 · 19:30", "135/88", "tối"],
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View className="flex-row gap-2 flex-wrap">
        <Chip variant="accent">Huyết áp</Chip>
        <Chip>Nhịp tim</Chip>
        <Chip>Đường máu</Chip>
        <Chip>Cholesterol</Chip>
        <Chip variant="soft">+</Chip>
      </View>

      <Card padding="md">
        <View className="flex-row justify-between items-center mb-2">
          <View>
            <Text className="font-bold text-ink">Huyết áp</Text>
            <Text className="text-[11px] text-ink-3">30 ngày qua · mmHg</Text>
          </View>
          <Segmented
            value={chart ? "chart" : "list"}
            onChange={(v) => setChart(v === "chart")}
            options={[
              { value: "list", label: "List" },
              { value: "chart", label: "Chart" },
            ]}
          />
        </View>
        {chart ? (
          <>
            <MetricChart
              systolic={[120, 132, 128, 135, 124, 130, 125, 128, 124]}
              diastolic={[78, 86, 82, 88, 80, 84, 78, 82, 80]}
            />
            <View className="flex-row justify-between mt-1">
              <Text className="text-[10px] text-ink-3">
                Tâm thu (xanh) · Tâm trương (đứt)
              </Text>
              <Text className="text-[10px] text-ink-3">TB 128/82</Text>
            </View>
          </>
        ) : (
          <View className="gap-1.5">
            {log.map(([t, v, when]) => (
              <View
                key={t}
                className="flex-row items-center py-1.5 border-b border-dashed border-line-soft"
              >
                <Text className="font-mono text-[11px] text-ink-2" style={{ width: 100 }}>
                  {t}
                </Text>
                <Text className="flex-1 font-mono font-bold text-ink">{v}</Text>
                <Chip variant="soft">{when}</Chip>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Button variant="primary" block leftIcon={<Text>📷</Text>} onPress={onAdd}>
        OCR phiếu xét nghiệm
      </Button>
    </ScrollView>
  );
}
