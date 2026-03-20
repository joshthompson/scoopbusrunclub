import { type Component, createSignal, Show } from "solid-js";
import { css } from "@style/css";
import { DirtBlock } from "@/components/ui/DirtBlock";
import { changeOwnPassword } from "@/utils/adminApi";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminInput } from "@/components/admin/AdminInput";
import { useAuth } from "@/components/admin/AuthGuard";
import { AdminAvatar } from "@/components/admin/AdminAvatar";

export const AccountPage: Component = () => {
  const auth = useAuth();

  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");
  const [saving, setSaving] = createSignal(false);

  const handleChangePassword = async (e: Event) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword() || !newPassword()) return;

    if (newPassword() !== confirmPassword()) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const result = await changeOwnPassword(currentPassword(), newPassword());
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class={styles.container}>
      <DirtBlock title="Account Settings">
        <div class={styles.section}>
          <div class={styles.avatar}>
            <AdminAvatar user={auth.username()} size="huge" />
          </div>
          <div class={styles.field}>
            <span class={styles.fieldLabel}>Username</span>
            <span class={styles.fieldValue}>{auth.username()}</span>
          </div>
        </div>
      </DirtBlock>

      <DirtBlock title="Change Password">
        <form onSubmit={handleChangePassword} class={styles.form}>
          <AdminInput
            label="Current Password"
            type="password"
            value={currentPassword()}
            onInput={(e) => setCurrentPassword(e.currentTarget.value)}
            autocomplete="current-password"
            fullWidth
            required
          />
          <AdminInput
            label="New Password"
            type="password"
            value={newPassword()}
            onInput={(e) => setNewPassword(e.currentTarget.value)}
            autocomplete="new-password"
            fullWidth
            required
          />
          <AdminInput
            label="Confirm New Password"
            type="password"
            value={confirmPassword()}
            onInput={(e) => setConfirmPassword(e.currentTarget.value)}
            autocomplete="new-password"
            fullWidth
            required
          />
          <Show when={error()}>
            <p class={styles.error}>{error()}</p>
          </Show>
          <Show when={success()}>
            <p class={styles.success}>{success()}</p>
          </Show>
          <div class={styles.actions}>
            <AdminButton
              type="submit"
              disabled={saving() || !currentPassword() || !newPassword() || !confirmPassword()}
            >
              {saving() ? "Saving…" : "Change Password"}
            </AdminButton>
          </div>
        </form>
      </DirtBlock>
    </div>
  );
};

const styles = {
  container: css({
    display: "flex",
    flexDirection: "row",
    gap: "2rem",
    mt: "2rem",
    alignItems: "flex-start",
    '& > *': {
      flex: 1,
    },

    '@media (max-width: 600px)': {
      flexDirection: "column",
      '& > *': {
        width: "100%",
        maxWidth: "none",
      },
    },
  }),
  section: css({
    padding: "0.5rem 0",
  }),
  avatar: css({
    display: "flex",
    justifyContent: "center",
    marginBottom: "1rem",
  }),
  field: css({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
  }),
  fieldLabel: css({
    fontSize: "0.8rem",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  }),
  fieldValue: css({
    fontSize: "1rem",
  }),
  spacer: css({
    height: "1.5rem",
  }),
  form: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    textAlign: "left",
    width: "100%",
  }),
  error: css({
    color: "var(--error-red)",
    fontSize: "0.875rem",
    margin: 0,
  }),
  success: css({
    fontSize: "0.875rem",
    margin: 0,
  }),
  actions: css({
    display: "flex",
    gap: "0.75rem",
    marginTop: "0.5rem",
  }),
};
