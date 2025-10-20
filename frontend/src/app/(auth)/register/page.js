// src/app/(auth)/register/page.js
"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { Toaster, toast } from "sonner";

// Password rules: >=8, A-Z, number, special
const passwordSchema = z
  .string()
  .min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร")
  .refine((v) => /[A-Z]/.test(v), "ต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว")
  .refine((v) => /\d/.test(v), "ต้องมีตัวเลขอย่างน้อย 1 ตัว")
  .refine((v) => /[^A-Za-z0-9]/.test(v), "ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว");

const schema = z.object({
  firstName: z.string().min(1, "กรุณากรอกชื่อจริง"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  phone: z
    .string()
    .min(1, "กรุณากรอกเบอร์โทร")
    .refine((v) => /^0\d{9}$/.test(v.replace(/[^\d]/g, "")), "รูปแบบเบอร์โทรไม่ถูกต้อง"),
  email: z.string().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: passwordSchema,
  confirm: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
}).refine((data) => data.password === data.confirm, {
  message: "รหัสผ่านและการยืนยันไม่ตรงกัน",
  path: ["confirm"],
});

// Checklist UI (inline, no extra component file)
function PasswordChecklist({ value = "" }) {
  const rules = [
    { ok: value.length >= 8, label: "อย่างน้อย 8 ตัวอักษร" },
    { ok: /[A-Z]/.test(value), label: "มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว" },
    { ok: /\d/.test(value), label: "มีตัวเลขอย่างน้อย 1 ตัว" },
    { ok: /[^A-Za-z0-9]/.test(value), label: "มีอักขระพิเศษอย่างน้อย 1 ตัว" },
  ];
  return (
    <ul className="mt-2 text-xs space-y-1">
      {rules.map((r, i) => (
        <li key={i} className={r.ok ? "text-emerald-700" : "text-gray-500"}>
          {r.ok ? "✔" : "•"} {r.label}
        </li>
      ))}
    </ul>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capsPwd, setCapsPwd] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      confirm: "",
    },
  });

  const passwordValue = useWatch({ control, name: "password" });

  const phoneInputProps = useMemo(
    () => ({
      inputMode: "numeric",
      pattern: "[0-9]*",
      maxLength: 13,
    }),
    []
  );

  const onSubmit = async (values) => {
    const phoneSan = values.phone.replace(/[^\d]/g, "");
    try {
      await api.post("/auth/register", {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: phoneSan,
        email: values.email,
        password: values.password,
      });

      const { data } = await api.post("/auth/login", {
        email: values.email,
        password: values.password,
      });

      setSession(data.token, data?.user?.role, data?.user || null);
      toast.success("สมัครสมาชิกสำเร็จ");
      router.replace(data?.user?.role === "ADMIN" ? "/admin" : "/");
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409) {
        toast.error("อีเมลนี้ถูกใช้งานแล้ว");
      } else if (!status) {
        toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่");
      } else {
        toast.error(e?.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ");
      }
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center">
      <Toaster richColors />
      <div className="mx-auto max-w-md w-full px-4">
        <div className="rounded-2xl border p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">สมัครสมาชิก</h1>
          <p className="text-gray-600 text-sm">กรอกข้อมูลเพื่อสร้างบัญชี</p>

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">ชื่อจริง</label>
                <input
                  className={`border rounded px-3 py-2 w-full ${errors.firstName ? "border-red-300" : ""}`}
                  {...register("firstName")}
                />
                {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm mb-1">นามสกุล</label>
                <input
                  className={`border rounded px-3 py-2 w-full ${errors.lastName ? "border-red-300" : ""}`}
                  {...register("lastName")}
                />
                {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">เบอร์โทร</label>
              <input
                className={`border rounded px-3 py-2 w-full ${errors.phone ? "border-red-300" : ""}`}
                placeholder="08xxxxxxxx"
                {...phoneInputProps}
                {...register("phone")}
              />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">อีเมล</label>
              <input
                className={`border rounded px-3 py-2 w-full ${errors.email ? "border-red-300" : ""}`}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">รหัสผ่าน</label>
              <div className="relative">
                <input
                  className={`border rounded px-3 py-2 w-full pr-20 ${errors.password ? "border-red-300" : ""}`}
                  type={showPwd ? "text" : "password"}
                  placeholder="อย่างน้อย 8 ตัวอักษร (มี A-Z, ตัวเลข, อักขระพิเศษ)"
                  autoComplete="new-password"
                  onKeyUp={(e)=> setCapsPwd(e.getModifierState && e.getModifierState("CapsLock"))}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={()=>setShowPwd(s=>!s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-black"
                >
                  {showPwd ? "ซ่อน" : "แสดง"}
                </button>
              </div>
              {capsPwd && <p className="text-xs text-amber-700 mt-1">Caps Lock ถูกเปิดอยู่</p>}
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
              <PasswordChecklist value={passwordValue} />
            </div>

            <div>
              <label className="block text-sm mb-1">ยืนยันรหัสผ่าน</label>
              <div className="relative">
                <input
                  className={`border rounded px-3 py-2 w-full pr-20 ${errors.confirm ? "border-red-300" : ""}`}
                  type={showConfirm ? "text" : "password"}
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  autoComplete="new-password"
                  {...register("confirm")}
                />
                <button
                  type="button"
                  onClick={()=>setShowConfirm(s=>!s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-black"
                >
                  {showConfirm ? "ซ่อน" : "แสดง"}
                </button>
              </div>
              {errors.confirm && <p className="text-xs text-red-600 mt-1">{errors.confirm.message}</p>}
            </div>

            <button
              className="w-full bg-black text-white px-4 py-2 rounded disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-4">
            มีบัญชีอยู่แล้ว?{" "}
            <Link href="/login" className="underline">เข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
