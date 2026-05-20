import { View, Text, Image } from "react-native";

interface AvatarProps {
  uri?: string | null;
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
  square?: boolean;
}

const sizeClass = {
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-14 h-14",
  xl: "w-20 h-20",
};

const textSize = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
};

export function Avatar({ uri, label, size = "md", square }: AvatarProps) {
  const initials = (label ?? "?").split(" ").map((p) => p[0]).slice(-2).join("").toUpperCase();
  const cls = [
    "border border-line bg-paper-2 items-center justify-center",
    sizeClass[size],
    square ? "rounded-lg" : "rounded-full",
  ].join(" ");
  if (uri) {
    return <Image source={{ uri }} className={cls} />;
  }
  return (
    <View className={cls}>
      <Text className={["font-bold text-ink-2", textSize[size]].join(" ")}>{initials}</Text>
    </View>
  );
}
