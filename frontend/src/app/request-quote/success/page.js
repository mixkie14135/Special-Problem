// frontend/src/app/request-quote/success/page.js
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function RequestQuoteSuccessPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref);
      alert("คัดลอกเลขอ้างอิงแล้ว");
    } catch {}
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-700">
        ✓
      </div>
      <h1 className="text-2xl font-semibold mt-4">ส่งคำขอสำเร็จ</h1>
      <p className="text-gray-600 mt-2">
        เราได้รับข้อมูลของคุณเรียบร้อยแล้ว ทีมงานจะติดต่อกลับโดยเร็วที่สุด
      </p>

      <div className="mt-6 p-4 rounded-lg border bg-gray-50">
        <div className="text-sm text-gray-600">เลขอ้างอิงของคุณ</div>
        <div className="mt-1 font-mono text-xl font-semibold">{ref || "-"}</div>
        {ref ? (
          <button
            onClick={copy}
            className="mt-2 px-3 py-1.5 text-sm rounded border hover:bg-white"
            title="คัดลอกเลขอ้างอิง"
          >
            คัดลอกเลขอ้างอิง
          </button>
        ) : null}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          href="/my/requests"
          className="px-4 py-2 rounded bg-black text-white text-center hover:opacity-90"
        >
          คำขอของฉัน
        </Link>
        <Link
          href="/request-quote"
          className="px-4 py-2 rounded border text-center hover:bg-gray-50"
        >
          ส่งคำขอใหม่
        </Link>
        <Link
          href="/"
          className="px-4 py-2 rounded border text-center hover:bg-gray-50"
        >
          กลับหน้าแรก
        </Link>
      </div>

      <div className="mt-10 text-sm text-left text-gray-600 max-w-md mx-auto">
        <p className="font-medium">สิ่งที่จะเกิดขึ้นต่อจากนี้</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>ทีมงานตรวจสอบข้อมูลและติดต่อคุณทางโทรศัพท์/อีเมล</li>
          <li>อาจนัดหมายดูหน้างานเพื่อประเมินรายละเอียดที่แม่นยำ</li>
          <li>หลังดูหน้างานเสร็จ จะส่งใบเสนอราคา (PDF) ให้ตรวจสอบ</li>
        </ul>
      </div>
    </main>
  );
}
