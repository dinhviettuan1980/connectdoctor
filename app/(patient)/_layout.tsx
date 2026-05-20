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

export default function PatientLayout() {
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
      <Tabs.Screen
        name="home"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ focused }) => <Icon label="H" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({ focused }) => <Icon label="C" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Lịch sử",
          tabBarIcon: ({ focused }) => <Icon label="L" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarIcon: ({ focused }) => <Icon label="P" active={focused} />,
        }}
      />
      {/* Hidden screens kept inside the (patient) group so router knows
          they exist but they don't appear in the tab bar. */}
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="ocr" options={{ href: null }} />
    </Tabs>
  );
}
