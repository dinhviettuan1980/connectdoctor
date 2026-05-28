import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/hooks/useAuth";
import { subscribeToThreads } from "@/lib/chat";

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
        tabBarActiveTintColor: "#5eb594",
        tabBarInactiveTintColor: "#767676",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={22} color={color} />
          ),
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: "#c3604a", fontSize: 9, minWidth: 16, height: 16 },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Lịch sử",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: "Sức khoẻ",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "heart" : "heart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
      {/* Hidden screens kept inside the (patient) group so router knows
          they exist but they don't appear in the tab bar. */}
      <Tabs.Screen
        name="knowledge"
        options={{
          title: "Kiến thức",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="ocr" options={{ href: null }} />
    </Tabs>
  );
}
