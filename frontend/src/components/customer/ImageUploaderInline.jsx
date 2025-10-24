"use client";
import { useState } from "react";
import { apiPost } from "@/lib/api";

export default function ImageUploaderInline({ requestId, onUploaded }) {
  const [busy, setBusy] = useState(false);

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach(f => fd.append("images", f));
    setBusy(true);
    try {
      const { data } = await apiPost(`/my/requests/${requestId}/images`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded?.(data?.data || []);
    } catch (e) {
      alert(e?.response?.data?.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="file" multiple accept="image/*" onChange={onPick} disabled={busy} className="hidden" />
      <span className={`px-3 py-1.5 rounded border cursor-pointer ${busy ? "opacity-60" : "hover:bg-gray-50"}`}>
        {busy ? "กำลังอัปโหลด…" : "เพิ่มรูป"}
      </span>
    </label>
  );
}
