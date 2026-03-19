import {
  type Component,
  createSignal,
  createResource,
  Show,
} from "solid-js";
import { css } from "@style/css";
import { DirtBlock } from "@/components/ui/DirtBlock";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  type AdminUser,
} from "@/utils/adminApi";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { Checkbox } from "@/components/ui/Checkbox";
import { useAuth } from "@/components/admin/AuthGuard";
import { AdminDropdown, AdminDropdownItem } from "@/components/admin/AdminDropdown";
import { AdminAvatar } from "@/components/admin/AdminAvatar";

export const UsersPage: Component = () => {
  const auth = useAuth();
  const [users, { refetch }] = createResource(fetchAdminUsers);

  // Create modal state
  const [createModalOpen, setCreateModalOpen] = createSignal(false);
  const [createUsername, setCreateUsername] = createSignal("");
  const [createPassword, setCreatePassword] = createSignal("");
  const [createIsSuperAdmin, setCreateIsSuperAdmin] = createSignal(false);
  const [createError, setCreateError] = createSignal("");
  const [createSaving, setCreateSaving] = createSignal(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = createSignal(false);
  const [editUser, setEditUser] = createSignal<AdminUser | null>(null);
  const [editUsername, setEditUsername] = createSignal("");
  const [editPassword, setEditPassword] = createSignal("");
  const [editIsSuperAdmin, setEditIsSuperAdmin] = createSignal(false);
  const [editError, setEditError] = createSignal("");
  const [editSaving, setEditSaving] = createSignal(false);

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    if (!createUsername() || !createPassword()) return;
    setCreateError("");
    setCreateSaving(true);
    try {
      const result = await createAdminUser(createUsername(), createPassword(), createIsSuperAdmin());
      if (result.error) {
        setCreateError(result.error);
      } else {
        setCreateModalOpen(false);
        setCreateUsername("");
        setCreatePassword("");
        setCreateIsSuperAdmin(false);
        refetch();
      }
    } catch {
      setCreateError("Failed to create user.");
    } finally {
      setCreateSaving(false);
    }
  };

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditUsername(user.username);
    setEditPassword("");
    setEditIsSuperAdmin(user.isSuperAdmin);
    setEditError("");
    setEditModalOpen(true);
  };

  const handleEdit = async (e: Event) => {
    e.preventDefault();
    const user = editUser();
    if (!user) return;
    setEditError("");
    setEditSaving(true);
    try {
      const data: { username?: string; password?: string; isSuperAdmin?: boolean } = {};
      if (editUsername() !== user.username) data.username = editUsername();
      if (editPassword()) data.password = editPassword();
      if (editIsSuperAdmin() !== user.isSuperAdmin) data.isSuperAdmin = editIsSuperAdmin();

      const result = await updateAdminUser(user._id, data);
      if (result.error) {
        setEditError(result.error);
      } else {
        setEditModalOpen(false);
        setEditUser(null);
        refetch();
      }
    } catch {
      setEditError("Failed to update user.");
    } finally {
      setEditSaving(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Show
      when={auth.isSuperAdmin()}
      fallback={
        <DirtBlock title="Access Denied" class={css({ mt: '2rem' })}>
          <p class={styles.emptyText}>Only super admins can manage users.</p>
        </DirtBlock>
      }
    >
      <div>
        <AdminToolbar>
          <AdminButton onClick={() => setCreateModalOpen(true)}>+ Add User</AdminButton>
        </AdminToolbar>

        <DirtBlock title="Admin Users">
          <AdminTable
            columns={[
              { title: "", width: "10px" },
              { title: "Username" },
              { title: "Role" },
              { title: "Created" },
              { title: "Created By" },
              { title: "Actions", width: '10px' },
            ]}
            data={(users() ?? []).map((user) => [
              <AdminAvatar user={user.username} size="large" />,
              user.username,
              user.isSuperAdmin ? "Super Admin" : "Admin",
              formatDate(user.createdAt),
              user.createdBy ?? "—",
              <AdminDropdown>
                <AdminDropdownItem onClick={() => openEdit(user)}>Edit</AdminDropdownItem>
                <AdminDropdownItem onClick={() => alert("Do that in the database")}>Delete</AdminDropdownItem>
              </AdminDropdown>,
            ])}
            empty="No users found."
          />
        </DirtBlock>

        {/* Add User Modal */}
        <Show when={createModalOpen()}>
          <AdminModal title="Add User" onClose={() => setCreateModalOpen(false)}>
            <form onSubmit={handleCreate} class={styles.form}>
              <AdminInput
                label="Username"
                value={createUsername()}
                onInput={(e) => setCreateUsername(e.currentTarget.value)}
                autocomplete="off"
                required
              />
              <AdminInput
                label="Password"
                type="password"
                value={createPassword()}
                onInput={(e) => setCreatePassword(e.currentTarget.value)}
                autocomplete="new-password"
                required
              />
              <Checkbox
                label="Super Admin"
                checked={createIsSuperAdmin()}
                onChange={(e) => setCreateIsSuperAdmin(e.currentTarget.checked)}
                variant="dirt"
              />
              {createError() && <p class={styles.error}>{createError()}</p>}
              <div class={styles.actions}>
                <AdminButton onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </AdminButton>
                <AdminButton type="submit" disabled={createSaving() || !createUsername() || !createPassword()}>
                  {createSaving() ? "Creating…" : "Create User"}
                </AdminButton>
              </div>
            </form>
          </AdminModal>
        </Show>

        {/* Edit User Modal */}
        <Show when={editModalOpen()}>
          <AdminModal title={`Edit User: ${editUser()?.username}`} onClose={() => setEditModalOpen(false)}>
            <form onSubmit={handleEdit} class={styles.form}>
              <AdminInput
                label="Username"
                value={editUsername()}
                onInput={(e) => setEditUsername(e.currentTarget.value)}
                autocomplete="off"
                required
              />
              <AdminInput
                label="New Password (leave blank to keep)"
                type="password"
                value={editPassword()}
                onInput={(e) => setEditPassword(e.currentTarget.value)}
                autocomplete="new-password"
              />
              <Checkbox
                label="Super Admin"
                checked={editIsSuperAdmin()}
                onChange={(e) => setEditIsSuperAdmin(e.currentTarget.checked)}
                variant="dirt"
              />
              {editError() && <p class={styles.error}>{editError()}</p>}
              <div class={styles.actions}>
                <AdminButton onClick={() => setEditModalOpen(false)}>
                  Cancel
                </AdminButton>
                <AdminButton type="submit" disabled={editSaving() || !editUsername()}>
                  {editSaving() ? "Saving…" : "Save Changes"}
                </AdminButton>
              </div>
            </form>
          </AdminModal>
        </Show>
      </div>
    </Show>
  );
};

const styles = {
  form: css({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    textAlign: "left",
  }),
  error: css({
    color: "#ff6b6b",
    fontSize: "0.875rem",
    margin: 0,
    textAlign: "center",
  }),
  actions: css({
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    marginTop: "0.5rem",
  }),
  emptyText: css({
    textAlign: "center",
    padding: "2rem",
  }),
};
