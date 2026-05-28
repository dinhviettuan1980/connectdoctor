import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useAuthStore } from "@/hooks/useAuth";
import { subscribeToThreads } from "@/lib/chat";

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
  const user = useAuthStore((s) => s.user);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToThreads(user.uid, "patient", (threads) => {
      setTotalUnread(threads.reduce((s, t) => s + (t.unreadForPatient ?? 0), 0));
    });
  }, [user?.uid]);

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
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: "#c3604a", fontSize: 9, minWidth: 16, height: 16 },
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
        name="health"
        options={{
          title: "Sức khoẻ",
          tabBarIcon: ({ focused }) => <Icon label="SK" active={focused} />,
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
      <Tabs.Screen
        name="knowledge"
        options={{
          title: "Kiến thức",
          tabBarIcon: ({ focused }) => <Icon label="K" active={focused} />,
        }}
      />
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="ocr" options={{ href: null }} />
    </Tabs>
  );
}
