import { Pressable, Text, View } from "react-native";
import { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  variant?: "default" | "soft" | "accent";
  onPress?: () => void;
}

const variantClass = {
  default: "border-line bg-paper",
  soft: "border-line-soft border-dashed bg-paper",
  accent: "border-accent-ink bg-accent-soft",
};

const textClass = {
  default: "text-ink",
  soft: "text-ink-3",
  accent: "text-accent-ink",
};

export function Chip({ children, variant = "default", onPress }: ChipProps) {
  const Container: any = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      className={["border rounded-full px-2.5 py-1 flex-row items-center gap-1", variantClass[variant]].join(" ")}
    >
      <Text className={["text-xs font-medium", textClass[variant]].join(" ")}>{children}</Text>
    </Container>
  );
}
