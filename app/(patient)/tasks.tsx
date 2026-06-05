import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, TextInput, Alert, Switch, ActivityIndicator } from "react-native";
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
import {
  subscribeToRepos, addRepo, updateRepo, deleteRepo, testRepoConnect,
  type Repo,
} from "@/lib/repos";
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
  repos,
  onEdit,
  onDelete,
  onApprove,
}: {
  task: Task;
  repos: Repo[];
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onApprove: (t: Task) => void;
}) {
  const taskRepos = repos.filter((r) => task.repos?.includes(r.id));
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

        {taskRepos.length > 0 && (
          <View className="flex-row flex-wrap gap-1">
            {taskRepos.map((r) => (
              <View key={r.id} className="bg-paper-2 border border-line-soft rounded px-1.5 py-0.5">
                <Text className="text-[10px] text-ink-3 font-mono">{r.name}</Text>
              </View>
            ))}
          </View>
        )}

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

function RepoCard({
  repo,
  onEdit,
  onDelete,
}: {
  repo: Repo;
  onEdit: (r: Repo) => void;
  onDelete: (r: Repo) => void;
}) {
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testRepoConnect(repo.url);
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card padding="md">
      <View className="gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-xs font-bold text-ink flex-1">{repo.name}</Text>
          {repo.needReview && (
            <Chip variant="accent">Auto review</Chip>
          )}
        </View>

        <Text className="text-[11px] text-ink-3 font-mono" numberOfLines={1}>{repo.url}</Text>

        <View className="flex-row items-center gap-1.5">
          <View className="bg-paper-2 border border-line-soft rounded px-1.5 py-0.5">
            <Text className="text-[10px] text-ink-3 font-mono">{repo.branch}</Text>
          </View>
        </View>

        {testResult && (
          <View className={`rounded-lg px-2 py-1.5 ${testResult.ok ? "bg-accent-soft" : "bg-warn/10"}`}>
            <Text className={`text-[11px] ${testResult.ok ? "text-accent-ink" : "text-warn"}`}>
              {testResult.message}
            </Text>
          </View>
        )}

        <View className="flex-row items-center gap-2 mt-1">
          <Button size="sm" variant="secondary" onPress={handleTest} loading={testing}>
            Test connect
          </Button>
          <Button size="sm" variant="secondary" onPress={() => onEdit(repo)}>
            Sửa
          </Button>
          <Button size="sm" variant="danger" onPress={() => onDelete(repo)}>
            Xoá
          </Button>
        </View>
      </View>
    </Card>
  );
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskRepos, setTaskRepos] = useState<string[]>([]);
  const [savingTask, setSavingTask] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Repo modal state
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [editingRepo, setEditingRepo] = useState<Repo | null>(null);
  const [repoName, setRepoName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");
  const [repoNeedReview, setRepoNeedReview] = useState(false);
  const [savingRepo, setSavingRepo] = useState(false);
  const [repoTestResult, setRepoTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [repoTesting, setRepoTesting] = useState(false);

  useEffect(() => subscribeToTasks(setTasks), []);
  useEffect(() => subscribeToRepos(setRepos), []);

  // ── Task modal ─────────────────────────────────────────────────────────────

  const openAddTask = () => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskRepos([]);
    setShowTaskModal(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskRepos(task.repos ?? []);
    setShowTaskModal(true);
  };

  const toggleTaskRepo = (id: string) => {
    setTaskRepos((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) return;
    setSavingTask(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          repos: taskRepos,
        });
      } else {
        await addTask(taskTitle.trim(), taskDesc.trim(), taskRepos);
      }
      setShowTaskModal(false);
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = (task: Task) => {
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

  // ── Repo modal ─────────────────────────────────────────────────────────────

  const openAddRepo = () => {
    setEditingRepo(null);
    setRepoName("");
    setRepoUrl("");
    setRepoBranch("main");
    setRepoNeedReview(false);
    setRepoTestResult(null);
    setShowRepoModal(true);
  };

  const openEditRepo = (repo: Repo) => {
    setEditingRepo(repo);
    setRepoName(repo.name);
    setRepoUrl(repo.url);
    setRepoBranch(repo.branch);
    setRepoNeedReview(repo.needReview);
    setRepoTestResult(null);
    setShowRepoModal(true);
  };

  const handleTestRepo = async () => {
    setRepoTesting(true);
    setRepoTestResult(null);
    try {
      const result = await testRepoConnect(repoUrl);
      setRepoTestResult(result);
    } finally {
      setRepoTesting(false);
    }
  };

  const handleSaveRepo = async () => {
    if (!repoName.trim() || !repoUrl.trim()) return;
    setSavingRepo(true);
    try {
      const data = {
        name: repoName.trim(),
        url: repoUrl.trim(),
        branch: repoBranch.trim() || "main",
        needReview: repoNeedReview,
      };
      if (editingRepo) {
        await updateRepo(editingRepo.id, data);
      } else {
        await addRepo(data);
      }
      setShowRepoModal(false);
    } finally {
      setSavingRepo(false);
    }
  };

  const handleDeleteRepo = (repo: Repo) => {
    Alert.alert("Xoá repo", `Xoá "${repo.name}"?`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => deleteRepo(repo.id) },
    ]);
  };

  // ── Derived lists ──────────────────────────────────────────────────────────

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
            <View className="flex-row gap-4">
              <Pressable onPress={openAddRepo}>
                <Text className="text-xs font-bold text-ink-3">+ Repo</Text>
              </Pressable>
              <Pressable onPress={openAddTask}>
                <Text className="text-xs font-bold text-accent-ink">+ Thêm</Text>
              </Pressable>
            </View>
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
                repos={repos}
                onEdit={openEditTask}
                onDelete={handleDeleteTask}
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
                repos={repos}
                onEdit={openEditTask}
                onDelete={handleDeleteTask}
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
                repos={repos}
                onEdit={openEditTask}
                onDelete={handleDeleteTask}
                onApprove={handleApprove}
              />
            ))}
          </View>
        )}

        {/* Repos */}
        <Divider />
        <View className="gap-2">
          <Text className="text-[10px] uppercase tracking-wider font-bold text-ink-3">
            Repos ({repos.length})
          </Text>
          {repos.length === 0 ? (
            <Text className="text-sm text-ink-3 text-center py-4">Chưa có repo nào. Nhấn + Repo để thêm.</Text>
          ) : (
            repos.map((r) => (
              <RepoCard key={r.id} repo={r} onEdit={openEditRepo} onDelete={handleDeleteRepo} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Task Add/Edit Modal */}
      <Modal visible={showTaskModal} transparent animationType="slide" onRequestClose={() => setShowTaskModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setShowTaskModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-paper rounded-t-2xl px-5 pt-5 pb-10 gap-4">
              <Text className="font-bold text-base text-ink">
                {editingTask ? "Sửa task" : "Thêm task mới"}
              </Text>

              <View className="gap-1">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3">Tiêu đề</Text>
                <TextInput
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="Mô tả ngắn việc cần làm..."
                  className="border border-line-soft rounded-lg px-3 py-2 text-sm text-ink bg-paper-2"
                  placeholderTextColor="#b5b5b5"
                  multiline
                />
              </View>

              <View className="gap-1">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3">Chi tiết (tuỳ chọn)</Text>
                <TextInput
                  value={taskDesc}
                  onChangeText={setTaskDesc}
                  placeholder="Mô tả chi tiết hơn, context, requirements..."
                  className="border border-line-soft rounded-lg px-3 py-2 text-sm text-ink bg-paper-2 min-h-20"
                  placeholderTextColor="#b5b5b5"
                  multiline
                  numberOfLines={4}
                  style={{ textAlignVertical: "top" }}
                />
              </View>

              {repos.length > 0 && (
                <View className="gap-2">
                  <Text className="text-[10px] uppercase tracking-wider text-ink-3">Repos liên quan</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {repos.map((r) => (
                      <Pressable key={r.id} onPress={() => toggleTaskRepo(r.id)}>
                        <View className={`border rounded-lg px-3 py-1.5 ${taskRepos.includes(r.id) ? "bg-accent-soft border-accent-ink" : "bg-paper-2 border-line-soft"}`}>
                          <Text className={`text-xs font-bold ${taskRepos.includes(r.id) ? "text-accent-ink" : "text-ink-3"}`}>
                            {r.name}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View className="flex-row gap-3">
                <Button variant="secondary" block onPress={() => setShowTaskModal(false)}>
                  Huỷ
                </Button>
                <Button
                  variant="primary"
                  block
                  loading={savingTask}
                  disabled={!taskTitle.trim()}
                  onPress={handleSaveTask}
                >
                  {editingTask ? "Lưu" : "Thêm"}
                </Button>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Repo Add/Edit Modal */}
      <Modal visible={showRepoModal} transparent animationType="slide" onRequestClose={() => setShowRepoModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setShowRepoModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-paper rounded-t-2xl px-5 pt-5 pb-10 gap-4">
              <Text className="font-bold text-base text-ink">
                {editingRepo ? "Sửa repo" : "Thêm repo"}
              </Text>

              <View className="gap-1">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3">Tên repo</Text>
                <TextInput
                  value={repoName}
                  onChangeText={setRepoName}
                  placeholder="connectdoctor"
                  className="border border-line-soft rounded-lg px-3 py-2 text-sm text-ink bg-paper-2"
                  placeholderTextColor="#b5b5b5"
                />
              </View>

              <View className="gap-1">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3">GitHub URL</Text>
                <TextInput
                  value={repoUrl}
                  onChangeText={(t) => { setRepoUrl(t); setRepoTestResult(null); }}
                  placeholder="https://github.com/owner/repo"
                  className="border border-line-soft rounded-lg px-3 py-2 text-sm text-ink bg-paper-2"
                  placeholderTextColor="#b5b5b5"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View className="gap-1">
                <Text className="text-[10px] uppercase tracking-wider text-ink-3">Branch</Text>
                <TextInput
                  value={repoBranch}
                  onChangeText={setRepoBranch}
                  placeholder="main"
                  className="border border-line-soft rounded-lg px-3 py-2 text-sm text-ink bg-paper-2"
                  placeholderTextColor="#b5b5b5"
                  autoCapitalize="none"
                />
              </View>

              <View className="flex-row items-center justify-between">
                <View className="gap-0.5">
                  <Text className="text-sm font-bold text-ink">Auto review commits</Text>
                  <Text className="text-[11px] text-ink-3">Tự động review commit mới bằng AI</Text>
                </View>
                <Switch
                  value={repoNeedReview}
                  onValueChange={setRepoNeedReview}
                  trackColor={{ true: "#5eb594" }}
                />
              </View>

              {repoTestResult && (
                <View className={`rounded-lg px-3 py-2 ${repoTestResult.ok ? "bg-accent-soft" : "bg-paper-2 border border-line-soft"}`}>
                  <Text className={`text-sm ${repoTestResult.ok ? "text-accent-ink" : "text-danger"}`}>
                    {repoTestResult.message}
                  </Text>
                </View>
              )}

              <Button
                variant="secondary"
                block
                loading={repoTesting}
                disabled={!repoUrl.trim()}
                onPress={handleTestRepo}
              >
                Test kết nối
              </Button>

              <View className="flex-row gap-3">
                <Button variant="secondary" block onPress={() => setShowRepoModal(false)}>
                  Huỷ
                </Button>
                <Button
                  variant="primary"
                  block
                  loading={savingRepo}
                  disabled={!repoName.trim() || !repoUrl.trim()}
                  onPress={handleSaveRepo}
                >
                  {editingRepo ? "Lưu" : "Thêm"}
                </Button>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
