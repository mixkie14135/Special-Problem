// frontend/src/app/(customer)/my/requests/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import Link from "next/link";

// map สีของสถานะ (สอดคล้องกับฝั่งแอดมินคร่าว ๆ)
const STATUS_STYLES = {
  NEW: "bg-gray-100 text-gray-800",
  SURVEY: "bg-amber-100 text-amber-800",
  SURVEY_DONE: "bg-emerald-100 text-emerald-800",
  QUOTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

const PAGE_SIZE = 10;

export default function MyRequestsPage() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // ตัวกรองสถานะ
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiGet("/my/requests");
        setItems(data?.data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || "โหลดคำขอไม่สำเร็จ");
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const kw = q.trim().toLowerCase();
    return items.filter((r) => {
      const okStatus = !status || r.status === status;
      const okKw =
        !kw ||
        (r.publicRef && r.publicRef.toLowerCase().includes(kw)) ||
        (r.title && r.title.toLowerCase().includes(kw)) ||
        (r.description && r.description.toLowerCase().includes(kw)) ||
        (r.category?.name && r.category.name.toLowerCase().includes(kw));
      return okStatus && okKw;
    });
  }, [items, q, status]);

  // เพจิเนชันฝั่ง client
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const copyRef = async (refText) => {
    try {
      await navigator.clipboard.writeText(refText);
      alert("คัดลอกเลขอ้างอิงแล้ว");
    } catch {}
  };

  if (err) return <main className="max-w-4xl mx-auto px-4 py-8 text-red-600">{err}</main>;
  if (!items) return <main className="max-w-4xl mx-auto px-4 py-8">กำลังโหลด…</main>;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">คำขอของฉัน</h1>
        <Link
          href="/request-quote"
          className="px-4 py-2 rounded bg-black text-white hover:opacity-90"
        >
          ขอใบเสนอราคาใหม่
        </Link>
      </div>

      {/* Toolbar: ค้นหา + กรองสถานะ */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="ค้นหา: เลขอ้างอิง / หัวข้อ / รายละเอียด / หมวด"
          className="border rounded px-3 py-2 w-full sm:w-72"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border rounded px-3 py-2"
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="NEW">ใหม่</option>
          <option value="SURVEY">นัดดูหน้างาน</option>
          <option value="SURVEY_DONE">ดูหน้างานเสร็จ</option>
          <option value="QUOTED">ส่งใบเสนอราคาแล้ว</option>
          <option value="APPROVED">ลูกค้าตกลง</option>
          <option value="REJECTED">ปฏิเสธ</option>
        </select>
      </div>

      {!filtered.length ? (
        <div className="rounded border p-6 text-center text-gray-600">
          ไม่พบรายการที่ตรงเงื่อนไข
          <div className="mt-3">
            <Link href="/request-quote" className="text-blue-600 hover:underline">
              ไปหน้า “ขอใบเสนอราคา”
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {pageItems.map((r) => (
              <div key={r.id} className="rounded border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-sm text-gray-600 mt-0.5 flex items-center gap-2">
                      <span>เลขอ้างอิง:</span>
                      <span className="font-mono">{r.publicRef || `#${r.id}`}</span>
                      <button
                        className="text-xs px-2 py-0.5 rounded border hover:bg-gray-50"
                        onClick={() => copyRef(r.publicRef || String(r.id))}
                        title="คัดลอกเลขอ้างอิง"
                      >
                        คัดลอก
                      </button>
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${STATUS_STYLES[r.status] || "bg-gray-100"}`}>
                    {r.status}
                  </div>
                </div>

                <div className="text-sm text-gray-700 mt-2 line-clamp-2">
                  {r.description}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                  {r.category?.name && <span>หมวด: {r.category.name}</span>}
                  <span>ส่งเมื่อ: {new Date(r.createdAt).toLocaleString("th-TH")}</span>
                </div>

                {/* Action zone: ขยายได้ภายหลัง */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/my/requests/${r.id}`} className="px-3 py-1.5 rounded border hover:bg-gray-50">
                    ดูรายละเอียด
                  </Link>

                  {/* ถ้ามีใบเสนอราคาแล้ว → ลิงก์ไปหน้าใบเสนอราคา (รวมทั้งหมด) */}
                  <Link href="/my/quotations" className="px-3 py-1.5 rounded border hover:bg-gray-50">
                    ใบเสนอราคา
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <span className="text-sm text-gray-600">
              ทั้งหมด {filtered.length} รายการ • หน้า {page} / {totalPages}
            </span>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ก่อนหน้า
            </button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ถัดไป
            </button>
          </div>
        </>
      )}
    </main>
  );
}
