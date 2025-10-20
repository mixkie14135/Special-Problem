// src/app/(auth)/login/page.js
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { Toaster, toast } from "sonner";

const schema = z.object({
  email: z.string().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน").min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร"),
});

export default function LoginPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setFocus,
  } = useForm({ resolver: zodResolver(schema), mode: "onSubmit" });

  const onSubmit = async (values) => {
    try {
      const { data } = await api.post("/auth/login", values);
      setSession(data.token, data?.user?.role, data?.user || null);
      toast.success("เข้าสู่ระบบสำเร็จ");
      router.replace(data?.user?.role === "ADMIN" ? "/admin" : "/");
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) {
        toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        setFocus("password");
      } else if (!status) {
        toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่");
      } else {
        toast.error(e?.response?.data?.message || "เกิดข้อผิดพลาด");
      }
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center">
      <Toaster richColors />
      <div className="mx-auto max-w-md w-full px-4">
        <div className="rounded-2xl border p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
          <p className="text-gray-600 text-sm">ยินดีต้อนรับกลับ</p>

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm mb-1">อีเมล</label>
              <input
                className={`border rounded px-3 py-2 w-full ${errors.email ? "border-red-300" : ""}`}
                type="email"
                placeholder="you@example.com"
                autoComplete="username"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">รหัสผ่าน</label>
              <div className="relative">
                <input
                  className={`border rounded px-3 py-2 w-full pr-20 ${errors.password ? "border-red-300" : ""}`}
                  type={show ? "text" : "password"}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  autoComplete="current-password"
                  onKeyUp={(e)=> setCaps(e.getModifierState && e.getModifierState("CapsLock"))}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={()=>setShow(s=>!s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-black"
                >
                  {show ? "ซ่อน" : "แสดง"}
                </button>
              </div>
              {caps && <p className="text-xs text-amber-700 mt-1">Caps Lock ถูกเปิดอยู่</p>}
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="text-gray-700 hover:underline">ลืมรหัสผ่าน?</Link>
            </div>

            <button
              className="w-full bg-black text-white px-4 py-2 rounded disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-4">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="underline">สมัครสมาชิก</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
