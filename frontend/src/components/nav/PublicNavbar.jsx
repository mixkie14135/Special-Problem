"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getToken, getRole, getUser, clearSession } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";

function NavItem({ href, children }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm ${active ? "font-semibold" : "text-gray-700 hover:text-black"}`}
    >
      {children}
    </Link>
  );
}

function UserIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V22h16v-1.5C20 16.91 16.418 14 12 14z"/>
    </svg>
  );
}

export default function PublicNavbar({ noShadow = false }) {
  const [authed, setAuthed] = useState(false);
  const [role, setRoleState] = useState(null);
  const [user, setUserState] = useState(null);
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  // ---- sync session (ครั้งแรก + เมื่อเซสชันเปลี่ยน + อีกแท็บเปลี่ยน) ----
  useEffect(() => {
    const read = () => {
      setAuthed(!!getToken());
      setRoleState(getRole());
      setUserState(getUser());
    };
    read();

    const handler = () => read();
    window.addEventListener("session:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("session:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // ---- ปิดเมนูเมื่อคลิกนอก/กด ESC ----
  useEffect(() => {
    if (!open) return;
    const closeOnClickOutside = (e) => {
      const el = menuRef.current, btn = btnRef.current;
      if (el && !el.contains(e.target) && btn && !btn.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", closeOnClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", closeOnClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const logout = () => {
    clearSession();
    setOpen(false);
    router.replace("/");
    router.refresh();
  };

  return (
    <header className={`sticky top-0 z-50 bg-white/80 backdrop-blur ${noShadow ? "" : "shadow-sm"}`}>
      <div className="h-[72px] flex items-center justify-between px-4 md:px-10 xl:px-[190px]">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo_brand.svg" alt="Bon Plus Thai" width={150} height={48} priority />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavItem href="/">หน้าแรก</NavItem>
          <NavItem href="/services">บริการของเรา</NavItem>
          <NavItem href="/portfolio">ผลงานของเรา</NavItem>
          <NavItem href="/estimate">ประเมินราคาเบื้องต้น</NavItem>
          <NavItem href="/request-quote">ขอใบเสนอราคา</NavItem>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {!authed ? (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full border px-2 py-1.5 hover:bg-gray-50"
              aria-label="ไปหน้าเข้าสู่ระบบ"
              title="เข้าสู่ระบบเพื่อเปิดเมนูโปรไฟล์"
            >
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-900 text-white">
                <UserIcon className="w-5 h-5" />
              </span>
            </Link>
          ) : (
            <div className="relative">
              <button
                ref={btnRef}
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 rounded-full border px-2 py-1.5 hover:bg-gray-50 focus:outline-none"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-900 text-white">
                  <UserIcon className="w-5 h-5" />
                </span>
                <span className="text-sm text-gray-800 max-w-[160px] truncate">
                  {user?.firstName ? `${user.firstName} ${user?.lastName ?? ""}`.trim() : (user?.email ?? "ผู้ใช้")}
                </span>
                <svg width="16" height="16" viewBox="0 0 20 20" className={`transition ${open ? "rotate-180" : ""}`} aria-hidden>
                  <path d="M5.5 7l4.5 4.5L14.5 7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </button>

              {open && (
                <div
                  ref={menuRef}
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg overflow-hidden z-[70]"
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName ? `${user.firstName} ${user?.lastName ?? ""}`.trim() : "ผู้ใช้"}
                    </p>
                    <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="py-1 text-sm">
                    {role === "ADMIN" && (
                      <Link href="/admin" className="block px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                        ไปหน้า Admin
                      </Link>
                    )}
                    <Link href="/my/requests" className="block px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                      คำขอของฉัน
                    </Link>
                    <Link href="/my/site-visits" className="block px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                      นัดหมาย
                    </Link>
                    <Link href="/my/quotations" className="block px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                      ใบเสนอราคา
                    </Link>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <button onClick={logout} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50" role="menuitem">
                    ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* mobile menu (ย่อ): */}
      <div className="md:hidden text-sm px-4 py-2 flex gap-3 overflow-auto">
        <Link href="/" className="py-1">หน้าแรก</Link>
        <Link href="/services" className="py-1">บริการของเรา</Link>
        <Link href="/portfolio" className="py-1">ผลงานของเรา</Link>
        <Link href="/estimate" className="py-1">ประเมินราคาเบื้องต้น</Link>
        <Link href="/request-quote" className="py-1">ขอใบเสนอราคา</Link>
        {!authed ? (
          <>
            <Link href="/login" className="py-1">เข้าสู่ระบบ</Link>
            <Link href="/register" className="py-1">สมัครสมาชิก</Link>
          </>
        ) : (
          <>
            {role === "ADMIN" && <Link href="/admin" className="py-1 text-amber-700">Admin</Link>}
            <Link href="/my/requests" className="py-1">คำขอของฉัน</Link>
            <Link href="/my/site-visits" className="py-1">นัดหมาย</Link>
            <Link href="/my/quotations" className="py-1">ใบเสนอราคา</Link>
            <button onClick={logout} className="py-1 text-red-600">ออกจากระบบ</button>
          </>
        )}
      </div>
    </header>
  );
}
