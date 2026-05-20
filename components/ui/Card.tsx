import { View, ViewProps } from "react-native";
import { ReactNode } from "react";

interface CardProps extends ViewProps {
  children: ReactNode;
  variant?: "default" | "soft" | "accent";
  padding?: "none" | "sm" | "md" | "lg";
}

const variantClass = {
  default: "border-line bg-paper",
  soft: "border-line-soft border-dashed bg-paper",
  accent: "border-accent-ink bg-accent-soft",
};

const padClass = {
  none: "p-0",
  sm: "p-2",
  md: "p-3",
  lg: "p-4",
};

export function Card({ children, variant = "default", padding = "md", className = "", ...rest }: CardProps & { className?: string }) {
  return (
    <View
      className={["border rounded-card", variantClass[variant], padClass[padding], className].join(" ")}
      {...rest}
    >
      {children}
    </View>
  );
}
