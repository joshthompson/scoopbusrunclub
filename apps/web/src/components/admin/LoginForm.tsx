import { createSignal, type Component } from "solid-js";
import { css } from "@style/css";
import { adminLogin } from "@/utils/adminApi";
import { DirtBlock } from "@/components/ui/DirtBlock";

export const LoginForm: Component<{ onSuccess: () => void }> = (props) => {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

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
    color: "#fff",
    textTransform: "uppercase",
  }),
  input: css({
    padding: "0.5rem 0.75rem",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    background: "rgba(0,0,0,0.3)",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    _focus: {
      borderColor: "rgba(255,255,255,0.6)",
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
    border: "3px double #fff",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1rem",
    textTransform: "uppercase",
    borderRadius: "4px",
    marginTop: "0.5rem",
    _hover: {
      background: "rgba(255,255,255,0.2)",
    },
    _disabled: {
      opacity: 0.5,
      cursor: "default",
    },
  }),
};
