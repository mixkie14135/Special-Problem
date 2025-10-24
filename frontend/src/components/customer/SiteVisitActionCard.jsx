"use client";
import { useState } from "react";
import { apiPost } from "@/lib/api";

export default function SiteVisitActionCard({ visit, onChanged }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!visit) return null;

  const canRespond = visit.status === "PENDING" && (visit.customerResponse ?? "PENDING") === "PENDING";

  async function respond(decision) {
    setBusy(true);
    try {
      const { data } = await apiPost(`/site-visits/${visit.id}/respond`, { decision, note });
      onChanged?.(data?.data);
    } catch (e) {
      alert(e?.response?.data?.message || "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border p-4">
      <div className="font-medium">นัดดูหน้างาน</div>
      <div className="text-sm text-gray-600 mt-1">
        วันที่/เวลา: {new Date(visit.scheduledAt).toLocaleString("th-TH")}
      </div>
      <div className="text-sm text-gray-600">
        สถานะ: {visit.status} • การตอบของลูกค้า: {visit.customerResponse || "PENDING"}
      </div>

      {canRespond ? (
        <>
          <textarea
            className="mt-3 w-full border rounded px-3 py-2"
            placeholder="หมายเหตุ (ถ้ามี)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-1.5 rounded bg-black text-white disabled:opacity-60"
              disabled={busy} onClick={() => respond("APPROVED")}>
              ยืนยันสะดวก
            </button>
            <button className="px-3 py-1.5 rounded border disabled:opacity-60"
              disabled={busy} onClick={() => respond("REJECTED")}>
              ไม่สะดวก
            </button>
          </div>
        </>
      ) : (
        <div className="mt-2 text-sm text-gray-500">คุณได้ตอบนัดหมายแล้ว</div>
      )}
    </div>
  );
}
