import { ReactNode } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
