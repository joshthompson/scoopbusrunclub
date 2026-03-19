import { type Component } from "solid-js";
import { AuthGuard } from "@/components/admin/AuthGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { EventsPage } from "./admin/EventsPage";
import { ScanPage } from "./admin/ScanPage";
import { UsersPage } from "./admin/UsersPage";
import { AccountPage } from "./admin/AccountPage";

export const AdminPage: Component = () => {
  return (
    <AuthGuard>
      <AdminLayout>
        <EventsPage />
      </AdminLayout>
    </AuthGuard>
  );
};

export const AdminScanPage: Component = () => {
  return (
    <AuthGuard>
      <AdminLayout fullPage>
        <ScanPage />
      </AdminLayout>
    </AuthGuard>
  );
};

export const AdminUsersPage: Component = () => {
  return (
    <AuthGuard>
      <AdminLayout>
        <UsersPage />
      </AdminLayout>
    </AuthGuard>
  );
};

export const AdminAccountPage: Component = () => {
  return (
    <AuthGuard>
      <AdminLayout>
        <AccountPage />
      </AdminLayout>
    </AuthGuard>
  );
};
