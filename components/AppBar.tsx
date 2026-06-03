import { Pressable, Text, View } from "react-native";
import { ReactNode } from "react";
import { useRouter } from "expo-router";

interface AppBarProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  close?: boolean;
  right?: ReactNode;
  left?: ReactNode;
}

export function AppBar({ title, subtitle, back, close, right, left }: AppBarProps) {
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between py-2">
      <View className="flex-row items-center gap-2 flex-1">
        {close && (
          <Pressable
            onPress={() => router.back()}
            className="w-8 h-8 items-center justify-center rounded-full bg-paper-2"
          >
            <Text className="text-base text-ink-2">✕</Text>
          </Pressable>
        )}
        {back && !close && (
          <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
            <Text className="text-xl text-ink-2">‹</Text>
          </Pressable>
        )}
        {left}
        <View className="flex-1">
          <Text className="text-base font-bold tracking-tight text-ink" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && <Text className="text-[11px] text-ink-3">{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}
