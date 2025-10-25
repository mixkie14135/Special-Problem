"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { fileUrl } from "@/lib/urls"; // ✅ เพิ่ม

export default function MyQuotationsPage() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiGet("/my/quotations");
        setItems(data?.data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || "โหลดใบเสนอราคาไม่สำเร็จ");
      }
    })();
  }, []);

  if (err) return <main className="max-w-4xl mx-auto px-4 py-8 text-red-600">{err}</main>;
  if (!items) return <main className="max-w-4xl mx-auto px-4 py-8">กำลังโหลด…</main>;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">ใบเสนอราคาของฉัน</h1>

      {!items.length ? (
        <div className="rounded border p-4 text-gray-600">ยังไม่มีใบเสนอราคา</div>
      ) : (
        <div className="grid gap-3">
          {items.map((q) => (
            <div key={q.id} className="rounded border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {q.request?.title || `คำขอ #${q.requestId}`}
                  </div>
                  <div className="text-sm text-gray-600">
                    ออกเมื่อ: {new Date(q.createdAt).toLocaleString("th-TH")}
                    {q.validUntil && <> • ใช้ได้ถึง: {new Date(q.validUntil).toLocaleDateString("th-TH")}</>}
                  </div>
                  <div className="text-sm text-gray-600">
                    สถานะใบเสนอราคา: {q.status} • ยอดรวม: {q.totalPrice ?? "-"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {q.fileUrl && (
                    <a
                      href={fileUrl(q.fileUrl) /* ✅ ใช้ตัวช่วยแปลง URL ให้ถูกโดเมน */}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded border hover:bg-gray-50"
                    >
                      ดาวน์โหลด PDF
                    </a>
                  )}
                  <Link href={`/my/requests/${q.requestId}`} className="px-3 py-1.5 rounded border hover:bg-gray-50">
                    ไปที่คำขอ
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
