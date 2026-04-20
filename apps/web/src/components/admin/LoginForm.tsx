import { createSignal, onCleanup, onMount, type Component } from "solid-js";
import { css } from "@style/css";
import { adminLogin } from "@/utils/adminApi";
import { DirtBlock } from "@/components/ui/DirtBlock";

export const LoginForm: Component<{ onSuccess: () => void }> = (props) => {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);


  onMount(() => {
    document.body.classList.add('login-page')
  })

  onCleanup(() => {
    document.body.classList.remove('login-page')
  })

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await adminLogin(username(), password());
      if (result.error) {
        setError(result.error);
      } else {
        props.onSuccess();
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class={styles.wrapper}>
      <div class={styles.centered}>
        <DirtBlock title="Admin Login">
          <form onSubmit={handleSubmit} class={styles.form}>
            <label class={styles.label}>
              Username
              <input
                class={styles.input}
                type="text"
                value={username()}
                onInput={(e) => setUsername(e.currentTarget.value)}
                autocomplete="username"
                required
              />
            </label>
            <label class={styles.label}>
              Password
              <input
                class={styles.input}
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                autocomplete="current-password"
                required
              />
            </label>
            {error() && <p class={styles.error}>{error()}</p>}
            <button class={styles.button} type="submit" disabled={loading()}>
              {loading() ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </DirtBlock>
      </div>
    </div>
  );
};

const styles = {
  wrapper: css({
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  }),
  centered: css({
    width: "100%",
    maxWidth: "360px",
  }),
  form: css({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    textAlign: "left",
  }),
  label: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    fontSize: "0.875rem",
    fontWeight: "bold",
    color: "var(--color-white)",
    textTransform: "uppercase",
  }),
  input: css({
    padding: "0.5rem 0.75rem",
    border: "2px solid var(--overlay-white-30)",
    borderRadius: "4px",
    background: "var(--overlay-black-30)",
    color: "var(--color-white)",
    fontSize: "1rem",
    outline: "none",
    _focus: {
      borderColor: "var(--overlay-white-60)",
    },
  }),
  error: css({
    color: "var(--error-red)",
    fontSize: "0.875rem",
    margin: 0,
    textAlign: "center",
  }),
  button: css({
    padding: "0.625rem 1.5rem",
    border: "3px double var(--color-white)",
    background: "var(--overlay-white-10)",
    color: "var(--color-white)",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1rem",
    textTransform: "uppercase",
    borderRadius: "4px",
    marginTop: "0.5rem",
    _hover: {
      background: "var(--overlay-white-20)",
    },
    _disabled: {
      opacity: 0.5,
      cursor: "default",
    },
  }),
};
