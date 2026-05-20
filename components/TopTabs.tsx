import { Pressable, Text, View } from "react-native";
import { ReactNode } from "react";

interface TopTabsProps {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}

export function TopTabs({ tabs, active, onChange }: TopTabsProps) {
  return (
    <View className="flex-row border-b border-line-soft">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className={[
              "flex-1 py-2 items-center border-b-2",
              on ? "border-accent-ink" : "border-transparent",
            ].join(" ")}
          >
            <Text className={["text-xs font-bold", on ? "text-ink" : "text-ink-3"].join(" ")}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
