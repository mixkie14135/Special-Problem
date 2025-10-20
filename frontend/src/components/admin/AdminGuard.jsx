// frontend/src/components/admin/AdminGuard.jsx
"use client";
import { useEffect, useState } from "react";
import { getRole, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function AdminGuard({ children }) {
  const [ok, setOk] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token || role !== "ADMIN") {
      router.replace("/login");
      return;
    }
    setOk(true);
  }, [router]);

  if (!ok) return null; // หรือใส่ skeleton ก็ได้
  return children;
}
