import {
  createContext,
  useContext,
  type JSX,
  createSignal,
  createResource,
  Show,
} from "solid-js";
import { validateToken, adminLogout } from "@/utils/adminApi";
import { LoginForm } from "./LoginForm";

interface AuthContextValue {
  username: () => string;
  isSuperAdmin: () => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>();

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthGuard");
  return ctx;
}

export function AuthGuard(props: { children: JSX.Element }) {
  const [loggedOut, setLoggedOut] = createSignal(false);

  const [user, { refetch }] = createResource(
    () => !loggedOut(),
    async (shouldCheck) => {
      if (!shouldCheck) return null;
      return validateToken();
    }
  );

  const handleLogin = () => {
    setLoggedOut(false);
    refetch();
  };

  const handleLogout = async () => {
    await adminLogout();
    setLoggedOut(true);
  };

  return (
    <Show
      when={user() && !loggedOut()}
      fallback={
        <Show when={!user.loading} fallback={<div style={{ padding: "2rem", "text-align": "center", color: "#fff" }}>Loading...</div>}>
          <LoginForm onSuccess={handleLogin} />
        </Show>
      }
    >
      <AuthContext.Provider
        value={{
          username: () => user()!.username,
          isSuperAdmin: () => !!user()!.isSuperAdmin,
          logout: handleLogout,
        }}
      >
        {props.children}
      </AuthContext.Provider>
    </Show>
  );
}
