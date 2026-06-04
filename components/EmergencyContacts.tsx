import { useEffect, useState } from "react";
import {
  View, Text, Pressable, Modal, TextInput, FlatList, Alert, Linking,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Contacts from "expo-contacts";
import { useRouter } from "expo-router";
import { Section } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { findUserByEmailOrPhone, subscribeToUser, isOnline } from "@/lib/users";
import type { AppUser, EmergencyContact } from "@/lib/types";

function isVietnameseMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("84") ? "0" + digits.slice(2) : digits;
  return /^0[35789]\d{8}$/.test(normalized);
}

function zaloLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("84") ? digits : digits.startsWith("0") ? "84" + digits.slice(1) : digits;
  return `https://zalo.me/${normalized}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[parts.length - 2][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

interface Props {
  contacts: EmergencyContact[];
  onChange: (next: EmergencyContact[]) => void;
}

interface ContactPick {
  id: string;
  name: string;
  phone: string;
}

export function EmergencyContacts({ contacts, onChange }: Props) {
  const router = useRouter();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState<ContactPick[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [linkedUsers, setLinkedUsers] = useState<Record<string, AppUser | null>>({});

  const [fName, setFName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fRelation, setFRelation] = useState("");
  const [saving, setSaving] = useState(false);

  // Subscribe to linked users for online + name + avatar
  useEffect(() => {
    const uids = contacts.map((c) => c.linkedUid).filter(Boolean) as string[];
    const unsubs = uids.map((uid) => subscribeToUser(uid, (u) => {
      setLinkedUsers((prev) => ({ ...prev, [uid]: u }));
    }));
    return () => { unsubs.forEach((u) => u()); };
  }, [contacts.map((c) => c.linkedUid).join(",")]);

  // Tick to refresh online indicator (lastSeen freshness)
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const openManual = (contact?: EmergencyContact) => {
    if (contact) {
      setEditing(contact);
      setFName(contact.name);
      setFPhone(contact.phone);
      setFEmail(contact.email ?? "");
      setFRelation(contact.relation ?? "");
    } else {
      setEditing(null);
      setFName(""); setFPhone(""); setFEmail(""); setFRelation("");
    }
    setShowAddSheet(false);
    setShowManual(true);
  };

  const saveManual = async () => {
    const name = fName.trim();
    const phone = fPhone.trim();
    const email = fEmail.trim().toLowerCase();
    if (!name || !phone) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên và số điện thoại.");
      return;
    }
    setSaving(true);
    try {
      const found = await findUserByEmailOrPhone(email, phone);
      const linkedUid = found?.uid;
      if (editing) {
        onChange(contacts.map((c) => c.id === editing.id
          ? { ...c, name, phone, email: email || undefined, relation: fRelation.trim() || undefined, linkedUid }
          : c));
      } else {
        onChange([
          ...contacts,
          {
            id: `${Date.now()}`,
            name, phone,
            email: email || undefined,
            relation: fRelation.trim() || undefined,
            source: "manual",
            linkedUid,
          },
        ]);
      }
      if (linkedUid) {
        Alert.alert("Đã liên kết", `Người này đã có tài khoản trên ConnectDoctor. Bạn có thể nhắn tin trực tiếp.`);
      }
      setShowManual(false);
    } finally {
      setSaving(false);
    }
  };

  const removeContact = (id: string) => {
    Alert.alert("Xoá liên hệ", "Xoá người thân này khỏi danh sách?", [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => onChange(contacts.filter((c) => c.id !== id)) },
    ]);
  };

  const openPhonePicker = async () => {
    setShowAddSheet(false);
    setPickerLoading(true);
    setShowPicker(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Không có quyền", "Vui lòng cấp quyền truy cập danh bạ trong cài đặt.");
        setShowPicker(false);
        return;
      }
      // Load contacts in chunks to avoid UI freeze on devices with many contacts
      const flat: ContactPick[] = [];
      let pageOffset = 0;
      const pageSize = 200;
      while (true) {
        const { data, hasNextPage } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
          pageSize,
          pageOffset,
        });
        for (const c of data) {
          if (!c.phoneNumbers?.length) continue;
          const name = c.name ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
          if (!name) continue;
          for (const p of c.phoneNumbers) {
            if (p.number) flat.push({ id: `${c.id}-${p.number}`, name, phone: p.number });
          }
        }
        // Show partial results immediately so UI is responsive
        setPhoneContacts([...flat].sort((a, b) => a.name.localeCompare(b.name, "vi")));
        if (!hasNextPage || data.length === 0) break;
        pageOffset += pageSize;
        // Yield to the event loop so React can render the partial list
        await new Promise((r) => setTimeout(r, 0));
      }
    } catch (e) {
      Alert.alert("Lỗi", "Không đọc được danh bạ.");
      setShowPicker(false);
    } finally {
      setPickerLoading(false);
    }
  };

  const selectFromPhone = async (p: ContactPick) => {
    const found = await findUserByEmailOrPhone(undefined, p.phone);
    onChange([
      ...contacts,
      {
        id: `${Date.now()}`,
        name: p.name, phone: p.phone,
        source: "contacts",
        linkedUid: found?.uid,
      },
    ]);
    setShowPicker(false);
    setPickerQuery("");
  };

  const callContact = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, "")}`).catch(() => {
      Alert.alert("Không gọi được", "Thiết bị không hỗ trợ gọi điện.");
    });
  };

  const openZalo = (phone: string) => {
    Linking.openURL(zaloLink(phone)).catch(() => {
      Alert.alert("Không mở được Zalo", "Vui lòng cài đặt ứng dụng Zalo.");
    });
  };

  const openEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(() => {});
  };

  const openChat = (uid: string) => {
    router.push(`/(patient)/family-chat/${uid}` as any);
  };

  const filteredPhoneContacts = phoneContacts.filter((c) => {
    if (!pickerQuery.trim()) return true;
    const q = pickerQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <>
      <Section
        title="NGƯỜI THÂN"
        action={
          <Pressable onPress={() => setShowAddSheet(true)} hitSlop={8}>
            <Text className="text-[11px] text-accent-ink">+ Thêm</Text>
          </Pressable>
        }
      >
        {contacts.length === 0 ? (
          <Text className="text-[11px] text-ink-3">Chưa có liên hệ. Nhấn Thêm để bổ sung từ danh bạ hoặc nhập thủ công.</Text>
        ) : (
          <View className="gap-2">
            {contacts.map((c) => {
              const showZalo = isVietnameseMobile(c.phone);
              const linked = c.linkedUid ? linkedUsers[c.linkedUid] : null;
              const online = linked ? isOnline(linked) : false;
              const displayName = linked?.displayName || c.name;
              return (
                <View key={c.id} className="flex-row items-center gap-3 py-1.5 border-b border-dashed border-line-soft">
                  <View>
                    <View className="w-9 h-9 rounded-full bg-accent-soft items-center justify-center">
                      <Text className="text-[11px] font-bold text-accent-ink">{initials(displayName)}</Text>
                    </View>
                    {c.linkedUid && (
                      <View
                        className="absolute"
                        style={{
                          bottom: 0, right: 0,
                          width: 10, height: 10, borderRadius: 5,
                          backgroundColor: online ? "#22c55e" : "#9ca3af",
                          borderWidth: 1.5, borderColor: "#fafaf7",
                        }}
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-xs font-bold text-ink" numberOfLines={1}>{displayName}</Text>
                      {c.relation ? (
                        <Text className="text-[10px] text-ink-3">· {c.relation}</Text>
                      ) : null}
                      {c.linkedUid ? (
                        <View className="bg-accent-soft px-1.5 py-0.5 rounded">
                          <Text className="text-[9px] text-accent-ink font-bold">CD</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="font-mono text-[10px] text-ink-3" numberOfLines={1}>
                      {c.phone}{c.email ? ` · ${c.email}` : ""}
                    </Text>
                    {c.linkedUid && (
                      <Text className="text-[10px]" style={{ color: online ? "#16a34a" : "#9ca3af" }}>
                        {online ? "● Đang hoạt động" : "○ Ngoại tuyến"}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    {c.linkedUid && (
                      <Pressable onPress={() => openChat(c.linkedUid!)} hitSlop={6}
                        className="w-8 h-8 rounded-full bg-accent items-center justify-center">
                        <Text className="text-[14px]">💬</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => callContact(c.phone)} hitSlop={6}
                      className="w-8 h-8 rounded-full bg-accent-soft items-center justify-center">
                      <Text className="text-[14px]">📞</Text>
                    </Pressable>
                    {showZalo && (
                      <Pressable onPress={() => openZalo(c.phone)} hitSlop={6}
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{ backgroundColor: "#0068FF" }}>
                        <Text className="text-[11px] font-bold text-white">Z</Text>
                      </Pressable>
                    )}
                    {c.email && (
                      <Pressable onPress={() => openEmail(c.email!)} hitSlop={6}
                        className="w-8 h-8 rounded-full bg-paper-2 items-center justify-center">
                        <Text className="text-[14px]">✉️</Text>
                      </Pressable>
                    )}
                  </View>
                  <View className="ml-1 flex-col gap-1">
                    <Pressable onPress={() => openManual(c)} hitSlop={6}>
                      <Text className="text-[10px] text-accent-ink">Sửa</Text>
                    </Pressable>
                    <Pressable onPress={() => removeContact(c.id)} hitSlop={6}>
                      <Text className="text-[10px] text-danger">Xoá</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Section>

      {/* Add source choice sheet */}
      <Modal visible={showAddSheet} transparent animationType="fade" onRequestClose={() => setShowAddSheet(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowAddSheet(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-paper rounded-t-2xl p-4 gap-2">
            <Text className="text-xs font-bold text-ink text-center mb-2">Thêm người thân</Text>
            <Button block variant="primary" onPress={openPhonePicker}>📇 Chọn từ danh bạ</Button>
            <Button block variant="secondary" onPress={() => openManual()}>✏️ Nhập thủ công</Button>
            <Button block variant="ghost" onPress={() => setShowAddSheet(false)}>Huỷ</Button>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Manual entry modal */}
      <Modal visible={showManual} animationType="slide" onRequestClose={() => setShowManual(false)}>
        <SafeAreaView className="flex-1 bg-paper">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-line-soft">
              <Pressable onPress={() => setShowManual(false)} hitSlop={8}>
                <Text className="text-sm text-ink-3">Huỷ</Text>
              </Pressable>
              <Text className="text-sm font-bold text-ink">{editing ? "Sửa người thân" : "Thêm người thân"}</Text>
              <Pressable onPress={saveManual} disabled={saving} hitSlop={8}>
                {saving
                  ? <ActivityIndicator size="small" color="#5eb594" />
                  : <Text className="text-sm font-bold text-accent-ink">Lưu</Text>}
              </Pressable>
            </View>
            <View className="p-4 gap-3">
              <Input label="Họ tên" value={fName} onChangeText={setFName} placeholder="VD: Nguyễn Văn A" />
              <Input
                label="Số điện thoại"
                value={fPhone}
                onChangeText={setFPhone}
                placeholder="VD: 0912345678"
                keyboardType="phone-pad"
              />
              <Input
                label="Email (tuỳ chọn)"
                value={fEmail}
                onChangeText={setFEmail}
                placeholder="VD: nguoithan@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Quan hệ (tuỳ chọn)"
                value={fRelation}
                onChangeText={setFRelation}
                placeholder="VD: Bố, Mẹ, Vợ, Con, Bác sĩ riêng…"
              />
              <Text className="text-[10px] text-ink-3 mt-1">
                Nếu người này đã có tài khoản ConnectDoctor (cùng email hoặc số điện thoại), bạn có thể nhắn tin trực tiếp với họ trong app.
              </Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Phone contact picker */}
      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView className="flex-1 bg-paper">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-line-soft">
            <Pressable onPress={() => { setShowPicker(false); setPickerQuery(""); }} hitSlop={8}>
              <Text className="text-sm text-ink-3">Huỷ</Text>
            </Pressable>
            <Text className="text-sm font-bold text-ink">Chọn từ danh bạ</Text>
            <View style={{ width: 32 }} />
          </View>
          <View className="px-4 pt-3">
            <TextInput
              className="bg-paper-2 rounded-lg px-3 py-2 text-sm"
              placeholder="Tìm theo tên hoặc số…"
              value={pickerQuery}
              onChangeText={setPickerQuery}
            />
          </View>
          {pickerLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#5eb594" />
              <Text className="text-[11px] text-ink-3 mt-2">Đang đọc danh bạ…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredPhoneContacts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 4 }}
              ListEmptyComponent={
                <Text className="text-[11px] text-ink-3 text-center mt-8">
                  {phoneContacts.length === 0 ? "Danh bạ trống." : "Không có kết quả."}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectFromPhone(item)}
                  className="flex-row items-center gap-3 py-2.5 border-b border-line-soft"
                >
                  <View className="w-9 h-9 rounded-full bg-accent-soft items-center justify-center">
                    <Text className="text-[11px] font-bold text-accent-ink">{initials(item.name)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-ink" numberOfLines={1}>{item.name}</Text>
                    <Text className="font-mono text-[10px] text-ink-3">{item.phone}</Text>
                  </View>
                  {isVietnameseMobile(item.phone) && (
                    <View className="w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: "#0068FF" }}>
                      <Text className="text-[9px] font-bold text-white">Z</Text>
                    </View>
                  )}
                </Pressable>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}
