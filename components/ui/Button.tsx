import { Pressable, Text, View, ActivityIndicator } from "react-native";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const containerByVariant = {
  primary: "bg-accent border-accent-ink",
  secondary: "bg-paper border-line",
  ghost: "bg-transparent border-transparent",
  danger: "bg-danger border-danger",
};

const textByVariant = {
  primary: "text-ink",
  secondary: "text-ink",
  ghost: "text-ink-2",
  danger: "text-paper",
};

const sizePadding = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2.5",
  lg: "px-5 py-3.5",
};

const sizeText = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function Button({
  children,
  onPress,
  variant = "secondary",
  size = "md",
  block,
  disabled,
  loading,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={[
        "border rounded-xl flex-row items-center justify-center gap-2",
        containerByVariant[variant],
        sizePadding[size],
        block ? "w-full" : "",
        disabled || loading ? "opacity-50" : "",
      ].join(" ")}
    >
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <>
          {leftIcon}
          <Text className={["font-bold", textByVariant[variant], sizeText[size]].join(" ")}>
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}
