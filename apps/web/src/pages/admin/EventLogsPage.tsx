import {
  type Component,
  createSignal,
  createResource,
  Show,
  For,
} from "solid-js";
import { css, cva, cx } from "@style/css";
import { DirtBlock } from "@/components/ui/DirtBlock";
import {
  fetchAdminLogs,
  fetchAdminUsers,
  type AdminEventLog,
} from "@/utils/adminApi";
import { Table as AdminTable } from "@/components/ui/Table";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { useAuth } from "@/components/admin/AuthGuard";

const ACTION_LABELS: Record<string, string> = {
  created_event: "Created Event",
  edited_event: "Edited Event",
  deleted_event: "Deleted Event",
  scanned_user: "Scanned User",
  created_user: "Created User",
  edited_user: "Edited User",
  changed_password: "Changed Password",
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

const PAGE_SIZE = 30;

export const EventLogsPage: Component = () => {
  const auth = useAuth();

  // Filters
  const [filterUsername, setFilterUsername] = createSignal("");
  const [filterAction, setFilterAction] = createSignal("");

  // Pagination state
  const [page, setPage] = createSignal(0);
  const [allLogs, setAllLogs] = createSignal<AdminEventLog[]>([]);
  const [hasMore, setHasMore] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  // Fetch admin users for the filter dropdown
  const [users] = createResource(fetchAdminUsers);

  const fetchPage = async (cursor?: number, append = false) => {
    setLoading(true);
    try {
      const result = await fetchAdminLogs({
        limit: PAGE_SIZE,
        cursor,
        username: filterUsername() || undefined,
        action: filterAction() || undefined,
      });
      if (append) {
        setAllLogs((prev) => [...prev, ...result.logs]);
      } else {
        setAllLogs(result.logs);
      }
      setHasMore(result.hasMore);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  fetchPage();

  const handleFilter = () => {
    setPage(0);
    fetchPage();
  };

  const handleLoadMore = () => {
    const logs = allLogs();
    if (logs.length === 0) return;
    const lastTimestamp = logs[logs.length - 1].timestamp;
    setPage((p) => p + 1);
    fetchPage(lastTimestamp, true);
  };

  const handleRefresh = () => {
    setPage(0);
    fetchPage();
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatAction = (action: string) => {
    return ACTION_LABELS[action] ?? action;
  };

  const actionBadgeVariant = (action: string): "create" | "edit" | "delete" | "scan" | "default" => {
    if (action.startsWith("created")) return "create";
    if (action.startsWith("edited") || action === "changed_password") return "edit";
    if (action.startsWith("deleted")) return "delete";
    if (action === "scanned_user") return "scan";
    return "default";
  };

  return (
    <Show
      when={auth.isSuperAdmin()}
      fallback={
        <DirtBlock title="Access Denied" class={css({ mt: "2rem" })}>
          <p class={styles.emptyText}>Only super admins can view event logs.</p>
        </DirtBlock>
      }
    >
      <div>
        <AdminToolbar>
          <AdminButton onClick={handleRefresh}>Refresh</AdminButton>
        </AdminToolbar>

        <DirtBlock title="Event Logs">
          <div class={styles.filters}>
            <AdminSelect
              label="User"
              size="small"
              value={filterUsername()}
              onChange={(e) => {
                setFilterUsername(e.currentTarget.value);
                handleFilter();
              }}
            >
              <option value="">All Users</option>
              <For each={users() ?? []}>
                {(u) => <option value={u.username}>{u.username}</option>}
              </For>
            </AdminSelect>
            <AdminSelect
              label="Action"
              size="small"
              value={filterAction()}
              onChange={(e) => {
                setFilterAction(e.currentTarget.value);
                handleFilter();
              }}
            >
              <option value="">All Actions</option>
              <For each={ALL_ACTIONS}>
                {(action) => (
                  <option value={action}>{ACTION_LABELS[action]}</option>
                )}
              </For>
            </AdminSelect>
          </div>

          <Show
            when={!loading() || allLogs().length > 0}
            fallback={<p class={styles.emptyText}>Loading…</p>}
          >
            <AdminTable
              columns={[
                { id: "timestamp", title: "When", width: "180px" },
                { id: "username", title: "Who", width: "120px" },
                { id: "action", title: "Action", width: "140px" },
                { id: "detail", title: "Detail" },
              ]}
              data={allLogs().map((log) => [
                <span class={styles.timestamp}>{formatTimestamp(log.timestamp)}</span>,
                <span class={styles.username}>
                  <AdminAvatar user={log.username} size="small" />
                  {log.username}
                </span>,
                <span class={styles.badge({ variant: actionBadgeVariant(log.action) })}>
                  {formatAction(log.action)}
                </span>,
                <span class={styles.detail}>{log.detail ?? "—"}</span>,
              ])}
              empty="No event logs found."
            />

            <Show when={hasMore() || loading()}>
              <div class={styles.loadMore}>
                <AdminButton
                  onClick={handleLoadMore}
                  disabled={loading()}
                  variant="secondary"
                >
                  {loading() ? "Loading…" : "Load More"}
                </AdminButton>
              </div>
            </Show>
          </Show>
        </DirtBlock>
      </div>
    </Show>
  );
};

const styles = {
  filters: css({
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "0.5rem",
    marginBottom: "0.75rem",
    textAlign: "left",
    "& > *": {
      flex: "0 1 160px",
    },
  }),
  emptyText: css({
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    padding: "2rem",
  }),
  loadMore: css({
    display: "flex",
    justifyContent: "center",
    padding: "1rem",
  }),
  timestamp: css({
    fontSize: "0.8rem",
    opacity: 0.8,
    whiteSpace: "nowrap",
  }),
  username: css({
    fontWeight: "bold",
    fontSize: "0.85rem",
    display: "inline-flex",
    alignItems: "center",
  }),
  detail: css({
    fontSize: "0.85rem",
  }),
  badge: cva({
    base: {
      display: "inline-block",
      padding: "0.15rem 0.5rem",
      borderRadius: "3px",
      fontSize: "0.7rem",
      fontWeight: "bold",
      textTransform: "uppercase",
      letterSpacing: "0.03em",
      whiteSpace: "nowrap",
      color: "white",
    },
    variants: {
      variant: {
        create: { background: "rgba(76, 175, 80, 1)" },
        edit: { background: "rgba(33, 150, 243, 1)" },
        delete: { background: "rgba(244, 67, 54, 1)" },
        scan: { background: "rgba(255, 193, 7, 1)" },
        default: { background: "rgba(255, 255, 255, 0.15)", color: "rgba(255, 255, 255, 0.8)" },
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }),
};
