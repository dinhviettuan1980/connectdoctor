import { Pressable, ScrollView, Text, View } from "react-native";

interface TopTabsProps {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}

export function TopTabs({ tabs, active, onChange }: TopTabsProps) {
  const scrollable = tabs.length > 4;
  const inner = tabs.map((t) => {
    const on = t.key === active;
    return (
      <Pressable
        key={t.key}
        onPress={() => onChange(t.key)}
        className={[
          scrollable ? "px-4 py-2 items-center border-b-2" : "flex-1 py-2 items-center border-b-2",
          on ? "border-accent-ink" : "border-transparent",
        ].join(" ")}
      >
        <Text className={["text-xs font-bold", on ? "text-ink" : "text-ink-3"].join(" ")}>
          {t.label}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <View className="border-b border-line-soft">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">{inner}</View>
        </ScrollView>
      </View>
    );
  }

  return <View className="flex-row border-b border-line-soft">{inner}</View>;
}
