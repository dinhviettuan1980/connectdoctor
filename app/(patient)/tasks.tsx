import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBar } from "@/components/AppBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Divider } from "@/components/ui/Segmented";
import {
  subscribeToTasks, addTask, updateTask, deleteTask,
  type Task, type TaskStatus,
} from "@/lib/tasks";
import { notify } from "@/lib/notify";

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Chờ làm",
  waiting: "Chờ duyệt",
  done: "Hoàn thành",
};

const STATUS_VARIANT: Record<TaskStatus, "default" | "accent" | "soft"> = {
  pending: "soft",
  waiting: "accent",
  done: "default",
};

function TaskCard({
  task,
  onEdit,
  onDelete,
  onApprove,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onApprove: (t: Task) => void;
}) {
  return (
    <Card padding="md">
      <View className="gap-2">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="text-xs font-bold text-ink flex-1" numberOfLines={2}>
            {task.title}
          </Text>
          <Chip variant={STATUS_VARIANT[task.status]}>
            {STATUS_LABEL[task.status]}
          </Chip>
        </View>

        {task.description ? (
          <Text className="text-[11px] text-ink-3">{task.description}</Text>
        ) : null}

        {task.progress && task.status !== "done" ? (
          <View className="flex-row items-center gap-1.5 rounded-lg bg-accent-soft px-2 py-1.5">
            <Text className="text-[11px]">⏳</Text>
            <Text className="text-[11px] text-accent-ink flex-1">{task.progress}</Text>
          </View>
        ) : null}

        {task.result ? (
          <>
            <Divider dashed />
            <View className="gap-1">
              <Text className="text-[10px] uppercase tracking-wider text-accent-ink font-bold">
                Kết quả từ agent
              </Text>
              <Text className="text-[11px] text-ink-2">{task.result}</Text>
            </View>
          </>
        ) : null}

        <View className="flex-row items-center gap-2 mt-1">
          {task.status === "pending" && (
            <>
              <Button size="sm" variant="secondary" onPress={() => onEdit(task)}>
                Sửa
              </Button>
              <Button size="sm" variant="danger" onPress={() => onDelete(task)}>
                Xoá
              </Button>
            </>
          )}
          {task.status === "waiting" && (
            <View className="flex-1 items-center">
              <Button size="sm" variant="primary" onPress={() => onApprove(task)}>
                ✓ OK — Commit & Done
              </Button>
            </View>
          )}
          <Text className="text-[10px] text-ink-4 self-center ml-auto font-mono">
            {new Date(task.createdAt).toLocaleDateString("vi-VN")}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => subscribeToTasks(setTasks), []);

  const openAdd = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setTitle(task.title);
    setDescription(task.description);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateTask(editing.id, { title: title.trim(), description: description.trim() });
      } else {
        await addTask(title.trim(), description.trim());
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (task: Task) => {
    Alert.alert("Xoá task", `Xoá "${task.title}"?`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => deleteTask(task.id) },
    ]);
  };

  const handleApprove = async (task: Task) => {
    setApprovingId(task.id);
    try {
      await updateTask(task.id, { status: "done" });
      await notify("Task đã duyệt ✓", `${task.title}${task.result ? `\n\n${task.result}` : ""}`);
    } finally {
      setApprovingId(null);
    }
  };

  const pending = tasks.filter((t) => t.status === "pending");
  const waiting = tasks.filter((t) => t.status === "waiting");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppBar
          title="Giao việc"
          subtitle="Quản lý task cho agent"
          right={
            <Pressable onPress={openAdd}>
              <Text className="text-xs font-bold text-accent-ink">+ Thêm</Text>
            </Pressable>
          }
        />

        {/* Pending */}
        <View className="gap-2">
          <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3">
            Chờ làm ({pending.length})
          </Text>
          {pending.length === 0 ? (
            <Text className="text-sm text-ink-3 text-center py-4">Không có task nào.</Text>
          ) : (
            pending.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onEdit={openEdit}
                onDelete={handleDelete}
                onApprove={handleApprove}
              />
            ))
          )}
        </View>

        {/* Waiting */}
        {waiting.length > 0 && (
          <View className="gap-2">
            <Text className="text-[10px] uppercase tracking-wider font-bold text-accent-ink">
              Chờ duyệt ({waiting.length})
            </Text>
            {waiting.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onEdit={openEdit}
                onDelete={handleDelete}
                onApprove={handleApprove}
              />
            ))}
          </View>
        )}

        {/* Done */}
        {done.length > 0 && (
          <View className="gap-2">
            <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3">
              Hoàn thành ({done.length})
            </Text>
            {done.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onEdit={openEdit}
                onDelete={handleDelete}
                onApprove={handleApprove}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setShowModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-paper rounded-t-2xl px-5 pt-5 pb-10 gap-4">
              <Text className="font-bold text-base text-ink">
                {editing ? "Sửa task" : "Thêm task mới"}
              </Text>

              <View className="gap-1">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3">Tiêu đề</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Mô tả ngắn việc cần làm..."
                  className="border border-line-soft rounded-lg px-3 py-2 text-sm text-ink bg-paper-2"
                  placeholderTextColor="#b5b5b5"
                  multiline
                />
              </View>

              <View className="gap-1">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3">
                  Chi tiết (tuỳ chọn)
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Mô tả chi tiết hơn, context, requirements..."
                  className="border border-line-soft rounded-lg px-3 py-2 text-sm text-ink bg-paper-2"
                  placeholderTextColor="#b5b5b5"
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 80, textAlignVertical: "top" }}
                />
              </View>

              <View className="flex-row gap-3">
                <Button variant="secondary" block onPress={() => setShowModal(false)}>
                  Huỷ
                </Button>
                <Button
                  variant="primary"
                  block
                  loading={saving}
                  disabled={!title.trim()}
                  onPress={handleSave}
                >
                  {editing ? "Lưu" : "Thêm"}
                </Button>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
