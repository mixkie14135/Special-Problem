// frontend/src/components/nav/AdminSidebar.jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin",             label: "ภาพรวม", exact: true },
  { href: "/admin/requests",    label: "คำขอ" },
  { href: "/admin/site-visits", label: "นัดหมายหน้างาน" },
  { href: "/admin/quotations",  label: "ใบเสนอราคา" },
  { href: "/admin/categories",  label: "หมวดหมู่บริการ" },
  { href: "/admin/portfolio",   label: "ผลงาน" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href, exact = false) => {
    if (exact) return pathname === href;
    // ให้ติด active เมื่อเข้าหน้าย่อย เช่น /admin/requests/123
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="hidden md:block w-60 shrink-0">
      {/* ถ้า navbar สูง 105px เปลี่ยนเป็น top-[105px] */}
      <div className="sticky top-[72px] space-y-1">
        <div className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">
          เมนูแอดมิน
        </div>

        {ITEMS.map((it) => {
          const active = isActive(it.href, it.exact);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`block rounded-lg px-3 py-2 text-sm transition
                ${active ? "bg-gray-900 text-white" : "hover:bg-gray-100 text-gray-800"}`}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
