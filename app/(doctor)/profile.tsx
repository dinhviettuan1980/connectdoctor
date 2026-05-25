import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBar } from "@/components/AppBar";
import { TopTabs } from "@/components/TopTabs";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Section } from "@/components/ui/Segmented";
import { Note } from "@/components/Note";
import { UserMenu } from "@/components/UserMenu";

const TABS = [
  { key: "profile", label: "Hồ sơ" },
  { key: "creds", label: "Bằng cấp" },
  { key: "work", label: "Công tác" },
];

export default function DoctorProfile() {
  const [tab, setTab] = useState("profile");
  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="px-4 pt-2 gap-2">
        <AppBar
          title="Hồ sơ bác sỹ"
          right={<UserMenu />}
        />
        <TopTabs tabs={TABS} active={tab} onChange={setTab} />
      </View>
      {tab === "profile" && <ProfileTab />}
      {tab === "creds" && <CredsTab />}
      {tab === "work" && <WorkTab />}
    </SafeAreaView>
  );
}

function ProfileTab() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card padding="md">
        <View className="flex-row gap-3 items-center">
          <Avatar label="Trần Hùng" size="lg" />
          <View className="flex-1">
            <Text className="font-bold text-ink">BS. Trần Minh Hùng</Text>
            <Text className="text-[11px] text-ink-3">Chuyên khoa Tim mạch</Text>
            <View className="flex-row gap-1.5 mt-1">
              <Chip variant="accent">✓ Đã xác minh</Chip>
              <Chip variant="soft">15 năm KN</Chip>
            </View>
          </View>
        </View>
      </Card>

      <Input label="Họ tên" value="Trần Minh Hùng" />
      <View className="flex-row gap-2">
        <View className="flex-1"><Input label="Chuyên khoa" value="Tim mạch" /></View>
        <View className="flex-1"><Input label="Năm KN" value="15" /></View>
      </View>
      <Input label="Email công khai" value="hung.tm@bv-tim.vn" />
      <Input label="Số điện thoại" value="+84 90 123 4567" />

      <Section title="Học hàm · học vị">
        <Card padding="sm">
          <View className="flex-row justify-between">
            <Text className="text-xs font-bold text-ink">Tiến sỹ Y khoa</Text>
            <Text className="text-[11px] text-ink-3">2018</Text>
          </View>
          <Text className="text-[11px] text-ink-3">ĐH Y Hà Nội</Text>
        </Card>
      </Section>
    </ScrollView>
  );
}

function CredsTab() {
  const creds = [
    { t: "Tiến sỹ Y khoa", sch: "ĐH Y Hà Nội", y: 2018, st: "verified" as const },
    { t: "Thạc sỹ Y học", sch: "ĐH Y Hà Nội", y: 2014, st: "verified" as const },
    { t: "Bác sỹ đa khoa", sch: "ĐH Y Dược TP. HCM", y: 2011, st: "verified" as const },
    { t: "CC. Tim mạch can thiệp", sch: "Singapore Heart Center", y: 2019, st: "pending" as const },
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Note>Bằng cấp sẽ được hệ thống xác minh trong 1–3 ngày.</Note>
      <View className="gap-1.5">
        {creds.map((c) => (
          <Card key={c.t} padding="md">
            <View className="flex-row items-start gap-2">
              <View
                className="w-10 h-12 border border-dashed border-line-soft items-center justify-center rounded"
              >
                <Text className="text-[10px] font-mono text-ink-3">PDF</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-ink">{c.t}</Text>
                <Text className="text-[11px] text-ink-3">
                  {c.sch} · {c.y}
                </Text>
                <View className="mt-1">
                  {c.st === "verified" ? (
                    <Chip variant="accent">✓ Đã xác minh</Chip>
                  ) : (
                    <Chip>⏳ Đang xét</Chip>
                  )}
                </View>
              </View>
            </View>
          </Card>
        ))}
        <Card variant="soft" padding="lg">
          <Text className="text-[11px] text-ink-3 text-center">＋ Kéo file PDF/JPG hoặc bấm chọn</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

function WorkTab() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card variant="accent" padding="md">
        <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-3">HIỆN TẠI</Text>
        <Text className="font-bold text-ink mt-1">BV Tim Hà Nội</Text>
        <Text className="text-[11px] text-ink-3">Khoa Nội Tim mạch · Bác sỹ chính</Text>
        <Text className="text-[11px] text-ink-3">Từ 2015 — nay</Text>
      </Card>

      <Section title="Lịch sử">
        <View className="gap-1.5">
          <Card padding="sm">
            <Text className="text-xs font-bold text-ink">BV Bạch Mai</Text>
            <Text className="text-[11px] text-ink-3">Bác sỹ nội trú · 2012–2015</Text>
          </Card>
          <Card padding="sm">
            <Text className="text-xs font-bold text-ink">BV ĐH Y Dược TP. HCM</Text>
            <Text className="text-[11px] text-ink-3">Thực tập · 2011</Text>
          </Card>
        </View>
      </Section>

      <Section title="Phòng khám tư">
        <Card variant="soft" padding="md">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs font-bold text-ink">PK Trần Minh Hùng</Text>
            <Text className="text-[11px] text-ink-3">Thứ 3, 5, 7</Text>
          </View>
          <Text className="text-[11px] text-ink-3">123 Lê Lợi, Q. Hoàn Kiếm, HN</Text>
        </Card>
      </Section>
    </ScrollView>
  );
}
