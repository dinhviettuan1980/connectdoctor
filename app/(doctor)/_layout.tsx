import { Tabs } from "expo-router";
import { Text, View } from "react-native";

function Icon({ label, active }: { label: string; active: boolean }) {
  return (
    <View
      className={[
        "w-5 h-5 border rounded-md items-center justify-center",
        active ? "border-ink bg-accent-soft" : "border-ink-3",
      ].join(" ")}
    >
      <Text className={["text-[8px] font-bold", active ? "text-ink" : "text-ink-3"].join(" ")}>
        {label}
      </Text>
    </View>
  );
}

export default function DoctorLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fafaf7",
          borderTopColor: "#2a2a2a",
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: "700" },
        tabBarActiveTintColor: "#1a1a1a",
        tabBarInactiveTintColor: "#767676",
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Trang chủ", tabBarIcon: ({ focused }) => <Icon label="H" active={focused} /> }} />
      <Tabs.Screen name="patients" options={{ title: "Bệnh nhân", tabBarIcon: ({ focused }) => <Icon label="B" active={focused} /> }} />
      <Tabs.Screen name="messages" options={{ title: "Tin nhắn", tabBarIcon: ({ focused }) => <Icon label="C" active={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Hồ sơ", tabBarIcon: ({ focused }) => <Icon label="P" active={focused} /> }} />
    </Tabs>
  );
}
