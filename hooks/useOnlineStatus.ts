import { useEffect, useMemo, useState } from "react";
import { subscribeToUser, isOnline } from "@/lib/users";

export function useOnlineStatus(uids: string[]): Record<string, boolean> {
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});
  const key = useMemo(() => [...uids].sort().join(","), [uids]);

  useEffect(() => {
    if (!key) return;
    const list = key ? key.split(",").filter(Boolean) : [];
    const unsubs = list.map((uid) =>
      subscribeToUser(uid, (user) => {
        setStatusMap((prev) => ({ ...prev, [uid]: isOnline(user) }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [key]);

  return statusMap;
}
