import { View, Text } from "react-native";
import { ReactNode } from "react";

export function Note({ children }: { children: ReactNode }) {
  return (
    <View className="bg-[#fbf3d8] border border-[#dcc684] rounded px-2 py-1.5">
      <Text className="text-xs text-[#5b4d20]" style={{ fontStyle: "italic" }}>
        {children}
      </Text>
    </View>
  );
}
