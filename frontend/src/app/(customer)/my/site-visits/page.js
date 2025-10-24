// src/app/(customer)/my/site-visits/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

const STATUS = ["PENDING", "DONE", "CANCELLED"];

export default function MySiteVisitsPage() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiGet("/my/site-visits");
        setItems(data?.data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || "โหลดนัดหมายไม่สำเร็จ");
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter(v => !status || v.status === status);
  }, [items, status]);

  if (err) return <main className="max-w-4xl mx-auto px-4 py-8 text-red-600">{err}</main>;
  if (!items) return <main className="max-w-4xl mx-auto px-4 py-8">กำลังโหลด…</main>;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">นัดหมายของฉัน</h1>

      <div className="flex items-center gap-2">
        <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-3 py-2">
          <option value="">สถานะทั้งหมด</option>
          {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!filtered.length ? (
        <div className="rounded border p-4 text-gray-600">ยังไม่มีนัดหมาย</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(v => (
            <div key={v.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{v.request?.title || `คำขอ #${v.requestId}`}</div>
                  <div className="text-sm text-gray-600">
                    วันที่/เวลา: {new Date(v.scheduledAt).toLocaleString("th-TH")}
                  </div>
                  <div className="text-sm text-gray-600">
                    สถานะ: {v.status} • การตอบของฉัน: {v.customerResponse || "PENDING"}
                  </div>
                </div>
                <Link href={`/my/requests/${v.requestId}`} className="px-3 py-1.5 rounded border hover:bg-gray-50">
                  ไปที่คำขอ
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
