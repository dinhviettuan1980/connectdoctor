import { Pressable, Text, View } from "react-native";
import { ReactNode } from "react";

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <View className="flex-row border border-line rounded-full bg-paper p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={["px-3 py-1 rounded-full", active ? "bg-ink" : ""].join(" ")}
          >
            <Text
              className={[
                "text-xs font-bold",
                active ? "text-paper" : "text-ink-3",
              ].join(" ")}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface SectionProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Section({ title, action, children }: SectionProps) {
  return (
    <View className="gap-1.5">
      {(title || action) && (
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-3">{title}</Text>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export function Divider({ dashed }: { dashed?: boolean }) {
  return (
    <View
      className={["h-px w-full", dashed ? "border-t border-dashed border-line-soft" : "bg-line-soft"].join(" ")}
    />
  );
}
