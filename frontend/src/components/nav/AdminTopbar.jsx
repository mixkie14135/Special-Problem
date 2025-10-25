// src/components/nav/AdminTopbar.jsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearSession } from "@/lib/auth";
import { confirm } from "@/lib/dialogs";
import "sweetalert2/dist/sweetalert2.min.css";

function UserIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V22h16v-1.5C20 16.91 16.418 14 12 14z"/>
    </svg>
  );
}

export default function AdminTopbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const { getUser } = require("@/lib/auth");
      setUser(getUser());
    }
  }, []);

  useEffect(() => {
    const closeOnClickOutside = (e) => {
      const el = menuRef.current, btn = btnRef.current;
      if (open && el && !el.contains(e.target) && btn && !btn.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", closeOnClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", closeOnClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const hardLogout = () => {
    clearSession();
    setOpen(false);
    router.replace("/login");
    router.refresh();
  };

  const onClickLogout = async () => {
    const { isConfirmed } = await confirm({
      title: "ออกจากระบบ?",
      text: "คุณต้องการออกจากระบบตอนนี้หรือไม่",
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!isConfirmed) return;
    hardLogout();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur shadow-sm">
      <div className="h-[72px] flex items-center justify-between px-4 md:px-10 xl:px-[190px]">
        <Link href="/admin" className="flex items-center gap-3" aria-label="ไปหน้าแดชบอร์ดแอดมิน">
          <Image src="/logo_brand.svg" alt="Bon Plus Thai" width={150} height={48} priority />
        </Link>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              ref={btnRef}
              onClick={() => setOpen(s => !s)}
              className="flex items-center gap-2 rounded-full border px-2 py-1.5 hover:bg-gray-50 focus:outline-none"
              aria-haspopup="menu"
              aria-expanded={open}
              type="button"
            >
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-900 text-white">
                <UserIcon />
              </span>
              <span className="text-sm text-gray-800 max-w-[160px] truncate">
                {user
                  ? user.firstName
                    ? `${user.firstName} ${user?.lastName ?? ""}`.trim()
                    : user.email ?? "ผู้ใช้"
                  : "กำลังโหลด..."}
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
                    {user?.firstName ? `${user.firstName} ${user?.lastName ?? ""}`.trim() : (user?.email ?? "ผู้ใช้")}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                </div>

                <div className="h-px bg-gray-100" />
                <div className="py-1 text-sm">
                  <Link href="/admin" className="block px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                    หน้าหลักแอดมิน
                  </Link>
                  <Link href="/admin/requests" className="block px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                    คำขอ
                  </Link>
                  <Link href="/admin/site-visits" className="block px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                    นัดหมายหน้างาน
                  </Link>
                  <Link href="/admin/quotations" className="block px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                    ใบเสนอราคา
                  </Link>
                  <div className="h-px bg-gray-100 my-1" />
                  <Link href="/" className="block px-4 py-2 hover:bg-gray-50" role="menuitem" onClick={() => setOpen(false)}>
                    ไปหน้าเว็บสาธารณะ
                  </Link>
                </div>

                <div className="h-px bg-gray-100" />
                <button onClick={onClickLogout} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50" role="menuitem">
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
