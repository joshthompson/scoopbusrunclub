import { type Component, type JSX, onCleanup, onMount, Show } from "solid-js";
import { A, useLocation, useNavigate } from "@solidjs/router";
import { css, cva, cx } from "@style/css";
import { useAuth } from "./AuthGuard";
import { AdminAvatar } from "./AdminAvatar";

export const AdminLayout: Component<{ children: JSX.Element, fullPage?: boolean }> = (props) => {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    const current = location.pathname;
    if (path === "/admin") return current === "/admin";
    return current.startsWith(path);
  };

  onMount(() => {
    document.body.classList.add('admin-page')
  })

  onCleanup(() => {
    document.body.classList.remove('admin-page')
  })

  return (
    <div class={cx(
      styles.page({ fullPage: props.fullPage }),
      props.fullPage && "full-screen-section",
    )}>
      <nav class={styles.nav}>
        <div class={styles.navInner}>
          <div class={styles.navLeft}>
            <A
              href="/admin"
              class={cx(styles.navLink, isActive("/admin") && !isActive("/admin/scan") && !isActive("/admin/users") && !isActive("/admin/account") && !isActive("/admin/logs") ? styles.navLinkActive : "")}
            >
              Events
            </A>
            <A
              href="/admin/scan"
              class={cx(styles.navLink, isActive("/admin/scan") ? styles.navLinkActive : "")}
            >
              Scanning
            </A>
            <Show when={auth.isSuperAdmin()}>
              <A
                href="/admin/users"
                class={cx(styles.navLink, isActive("/admin/users") ? styles.navLinkActive : "")}
              >
                Users
              </A>
              <A
                href="/admin/logs"
                class={cx(styles.navLink, isActive("/admin/logs") ? styles.navLinkActive : "")}
              >
                Logs
              </A>
            </Show>
          </div>
          <div class={styles.navRight}>
            <button class={styles.toolbarOutlineBtn} onClick={() => navigate("/admin/account")}>
              <AdminAvatar user={auth.username()} size="small" />
              {auth.username()}
            </button>
            <button class={styles.toolbarOutlineBtn} onClick={() => auth.logout()}>
              Logout
            </button>
            <button class={styles.toolbarOutlineBtn} onClick={() => window.open("/", "_blank")}>
              Main Site →
            </button>
          </div>
        </div>
      </nav>
      <main class={styles.main({ fullPage: props.fullPage })}>{props.children}</main>
    </div>
  );
};

const styles = {
  page: cva({
    base: {
      minHeight: "100dvh",
    },
    variants: {
      fullPage: {
        true: {
          display: "flex",
          flexDirection: "column",
        },
      },
    },
  }),
  nav: css({
    background: "black",
    position: "sticky",
    top: 0,
    zIndex: 100,
  }),
  navInner: css({
    maxWidth: "100%",
    margin: "0 auto",
    padding: "0.75rem 1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",

    '@media (max-width: 640px)': {
      justifyContent: "center",
    },
  }),
  navLeft: css({
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
  }),
  navRight: css({
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  }),
  navLink: css({
    color: "#fff",
    textDecoration: "none",
    padding: "0.375rem 0.75rem",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    _hover: {
      background: "rgba(255,255,255,0.1)",
    },
  }),
  navLinkActive: css({
    background: "rgba(255,255,255,0.15)",
  }),
  usernameLink: css({
    color: "rgba(255,255,255,0.7)",
    fontSize: "0.8rem",
    textDecoration: "none",
    _hover: {
      color: "#fff",
      textDecoration: "underline",
    },
  }),
  toolbarOutlineBtn: css({
    padding: "0.375rem 0.75rem",
    border: "2px solid rgba(255,255,255,0.3)",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    borderRadius: "4px",
    _hover: {
      background: "rgba(255,255,255,0.1)",
    },
  }),
  main: cva({
    base: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "1.5rem 1rem",
    },
    variants: {
      fullPage: {
        true: {
          width: "100%",
          maxWidth: "100%",
          flexGrow: 1,
          padding: "0",
          display: "flex",
          flexDirection: "column",
        },
      },
    },
  }),
};
