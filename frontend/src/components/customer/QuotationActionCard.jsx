"use client";
import { useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function QuotationActionCard({ requestId, initialQuotation }) {
  const [q, setQ] = useState(initialQuotation || null);
  const [confirm, setConfirm] = useState({ open: false, decision: null });

  async function refresh() {
    try {
      const { data } = await apiGet(`/quotations/${requestId}?latest=true`);
      setQ(data?.data || null);
    } catch {}
  }

  async function decide(decision) {
    setConfirm({ open: false, decision: null });
    try {
      await apiPost(`/quotations/${q.id}/decision`, { decision });
      await refresh();
      alert(decision === "APPROVED" ? "ยืนยันใบเสนอราคาแล้ว" : "ปฏิเสธใบเสนอราคาแล้ว");
    } catch (e) {
      alert(e?.response?.data?.message || "ทำรายการไม่สำเร็จ");
    }
  }

  if (!q) return <div className="rounded border p-4 text-gray-600">ยังไม่มีใบเสนอราคา</div>;

  return (
    <div className="rounded border p-4">
      <div className="font-medium">ใบเสนอราคา (สถานะ: {q.status})</div>
      <div className="text-sm text-gray-600 mt-1">
        ออกเมื่อ: {new Date(q.createdAt).toLocaleString("th-TH")}
        {q.validUntil && <> • ใช้ได้ถึง: {new Date(q.validUntil).toLocaleDateString("th-TH")}</>}
      </div>
      <div className="text-sm text-gray-600">ยอดรวม: {q.totalPrice ?? "-"}</div>

      <div className="mt-3 flex gap-2">
        {q.fileUrl && (
          <a href={q.fileUrl} target="_blank" className="px-3 py-1.5 rounded border hover:bg-gray-50">ดาวน์โหลด PDF</a>
        )}
        {q.status === "PENDING" && (
          <>
            <button className="px-3 py-1.5 rounded bg-black text-white"
              onClick={() => setConfirm({ open: true, decision: "APPROVED" })}>
              ยอมรับ
            </button>
            <button className="px-3 py-1.5 rounded border"
              onClick={() => setConfirm({ open: true, decision: "REJECTED" })}>
              ปฏิเสธ
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="ยืนยันการทำรายการ"
        message={confirm.decision === "APPROVED" ? "ยืนยันการยอมรับใบเสนอราคา?" : "ยืนยันการปฏิเสธใบเสนอราคา?"}
        onClose={() => setConfirm({ open: false, decision: null })}
        onConfirm={() => decide(confirm.decision)}
      />
    </div>
  );
}
