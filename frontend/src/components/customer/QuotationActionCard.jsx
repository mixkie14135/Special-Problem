// frontend/src/components/customer/QuotationActionCard.jsx
"use client";

import { useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { fileUrl } from "@/lib/urls";
import { Toaster, toast } from "sonner"; // ✅ ใช้ sonner

export default function QuotationActionCard({ requestId, initialQuotation }) {
  const [q, setQ] = useState(initialQuotation || null);
  const [confirm, setConfirm] = useState({ open: false, decision: null });

  async function refresh() {
    try {
      const { data } = await apiGet(`/quotations/${requestId}?latest=true`);
      setQ(data?.data || null);
    } catch {
      // แสดงเงียบ ๆ ถ้ารีเฟรชไม่ได้
    }
  }

  async function decide(decision) {
    setConfirm({ open: false, decision: null });
    try {
      await apiPost(`/quotations/${q.id}/decision`, { decision });
      await refresh();
      toast.success(
        decision === "APPROVED" ? "ยืนยันใบเสนอราคาเรียบร้อย" : "ปฏิเสธใบเสนอราคาเรียบร้อย"
      );
    } catch (e) {
      toast.error(e?.response?.data?.message || "ทำรายการไม่สำเร็จ");
    }
  }

  if (!q) {
    return (
      <div className="rounded border p-4 text-gray-600">
        <Toaster richColors /> {/* ให้มี toaster เผื่อใช้ในอนาคต */}
        ยังไม่มีใบเสนอราคา
      </div>
    );
  }

  return (
    <div className="rounded border p-4">
      {/* Toaster วางในคอมโพเนนต์เพื่อให้แยกใช้งานอิสระจากหน้าอื่นได้ */}
      <Toaster richColors />

      <div className="font-medium">ใบเสนอราคา (สถานะ: {q.status})</div>
      <div className="text-sm text-gray-600 mt-1">
        ออกเมื่อ: {new Date(q.createdAt).toLocaleString("th-TH")}
        {q.validUntil && <> • ใช้ได้ถึง: {new Date(q.validUntil).toLocaleDateString("th-TH")}</>}
      </div>
      <div className="text-sm text-gray-600">
        ยอดรวม: {q.totalPrice != null ? new Intl.NumberFormat("th-TH").format(q.totalPrice) : "-"}
      </div>

      <div className="mt-3 flex gap-2">
        {q.fileUrl && (
          <a
            href={fileUrl(q.fileUrl)}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded border hover:bg-gray-50"
          >
            ดาวน์โหลด PDF
          </a>
        )}
        {q.status === "PENDING" && (
          <>
            <button
              className="px-3 py-1.5 rounded bg-black text-white"
              onClick={() => setConfirm({ open: true, decision: "APPROVED" })}
            >
              ยอมรับ
            </button>
            <button
              className="px-3 py-1.5 rounded border"
              onClick={() => setConfirm({ open: true, decision: "REJECTED" })}
            >
              ปฏิเสธ
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="ยืนยันการทำรายการ"
        message={
          confirm.decision === "APPROVED"
            ? "ยืนยันการยอมรับใบเสนอราคา?"
            : "ยืนยันการปฏิเสธใบเสนอราคา?"
        }
        onClose={() => setConfirm({ open: false, decision: null })}
        onConfirm={() => decide(confirm.decision)}
        confirmText={confirm.decision === "APPROVED" ? "ยืนยัน" : "ยืนยันการปฏิเสธ"}
        cancelText="ยกเลิก"
      />
    </div>
  );
}

