// src/app/admin/layout.js
import PublicNavbar from "@/components/nav/PublicNavbar";
import AdminSidebar from "@/components/nav/AdminSidebar";
import AdminGuard from "@/components/admin/AdminGuard";

export const metadata = { title: "Admin • Bon Plus Thai" };

export default function AdminLayout({ children }) {
  return (
    <>
      {/* ใช้ navbar เดิมได้ (มีเมนูโปรไฟล์/ออกระบบ) */}
      <PublicNavbar />

      {/* โครงหน้าแอดมิน = sidebar + content */}
      <AdminGuard>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-6">
            <AdminSidebar />
            <div>{children}</div>
          </div>
        </div>
      </AdminGuard>
    </>
  );
}

