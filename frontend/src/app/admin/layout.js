// src/app/admin/layout.js
import AdminTopbar from "@/components/nav/AdminTopbar";   // CHANGED: ใช้ Topbar ของแอดมิน
import AdminSidebar from "@/components/nav/AdminSidebar";
import AdminGuard from "@/components/admin/AdminGuard";

export const metadata = { title: "Admin • Bon Plus Thai" };

export default function AdminLayout({ children }) {
  return (
    <>
      {/* CHANGED: ไม่ใช้ PublicNavbar บน /admin — ใช้ AdminTopbar แทน */}
      <AdminTopbar />  {/* CHANGED */}

      {/* โครงหน้าแอดมิน = sidebar + content (ห่อด้วย AdminGuard) */}
      <AdminGuard>
        {/* CHANGED: ขยายความกว้าง และใช้ layout แบบเดียวกับหลังบ้าน */}
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex gap-6 py-6">
            <AdminSidebar />
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        </div>
      </AdminGuard>
    </>
  );
}
