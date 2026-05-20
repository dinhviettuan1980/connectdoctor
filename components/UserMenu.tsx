import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  patient: "Bệnh nhân",
  doctor: "Bác sĩ",
  admin: "Quản trị viên",
};

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const [visible, setVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleLogout = async () => {
    setVisible(false);
    setConfirming(false);
    await signOut();
  };

  if (!user) return null;

  return (
    <>
      <Pressable onPress={() => setVisible(true)} hitSlop={8}>
        <Avatar label={user.displayName ?? "?"} size="md" />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        {/* Backdrop */}
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
          onPress={() => { setVisible(false); setConfirming(false); }}
        >
          {/* Panel — stop propagation so taps inside don't close */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 60,
              right: 16,
              minWidth: 220,
            }}
          >
            <View className="bg-paper border border-line rounded-card shadow-sm overflow-hidden">
              {/* User info header */}
              <View className="px-4 pt-4 pb-3 gap-2 border-b border-line-soft">
                <View className="flex-row items-center gap-3">
                  <Avatar label={user.displayName ?? "?"} size="lg" />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-ink" numberOfLines={1}>
                      {user.displayName ?? "—"}
                    </Text>
                    <Text className="text-[11px] text-ink-3 mt-0.5" numberOfLines={1}>
                      {user.email ?? user.phone ?? "—"}
                    </Text>
                  </View>
                </View>
                <View className="self-start bg-accent-soft border border-accent-ink rounded-full px-2.5 py-0.5">
                  <Text className="text-[10px] font-bold text-accent-ink uppercase tracking-wider">
                    {ROLE_LABEL[user.role] ?? user.role}
                  </Text>
                </View>
              </View>

              {/* Menu items */}
              <View className="py-1">
                {confirming ? (
                  <View className="px-4 py-3 gap-2">
                    <Text className="text-xs text-ink-2">Bạn chắc muốn đăng xuất?</Text>
                    <View className="flex-row gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => setConfirming(false)}
                      >
                        Huỷ
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onPress={handleLogout}
                      >
                        Đăng xuất
                      </Button>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setConfirming(true)}
                    className="flex-row items-center gap-3 px-4 py-3 active:bg-paper-2"
                  >
                    <Text className="text-danger text-sm">⎋</Text>
                    <Text className="text-sm font-bold text-danger">Đăng xuất</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
