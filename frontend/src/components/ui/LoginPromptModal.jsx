"use client";
import { useRouter } from "next/navigation";

export default function LoginPromptModal({ open, onClose }) {
  const router = useRouter();
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999]">
      <div className="bg-white rounded-lg shadow-lg w-[90%] max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">เข้าสู่ระบบก่อนส่งคำขอ</h2>
        <p className="text-sm text-gray-600">
          คุณต้องเข้าสู่ระบบหรือสมัครสมาชิกก่อน จึงจะสามารถส่งคำขอใบเสนอราคาได้
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-gray-50"
          >
            ปิด
          </button>
          <button
            onClick={() => router.push(`/register?next=${encodeURIComponent("/request-quote")}`)}
            className="px-4 py-2 rounded border hover:bg-gray-50"
          >
            สมัครสมาชิก
          </button>
          <button
            onClick={() => router.push(`/login?next=${encodeURIComponent("/request-quote")}`)}
            className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
