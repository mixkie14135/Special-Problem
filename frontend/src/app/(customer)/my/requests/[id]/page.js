// frontend/src/app/(customer)/my/requests/[id]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { fileUrl } from "@/lib/urls";

import RequestStatusBadge from "@/components/customer/RequestStatusBadge";
import ImageUploaderInline from "@/components/customer/ImageUploaderInline";
import RequestTimeline from "@/components/customer/RequestTimeline";
import SiteVisitActionCard from "@/components/customer/SiteVisitActionCard";
import QuotationActionCard from "@/components/customer/QuotationActionCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function MyRequestDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");
  const [busyCancel, setBusyCancel] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function load() {
    try {
      const { data } = await apiGet(`/my/requests/${id}`);
      setItem(data?.data || null);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.message || "โหลดรายละเอียดไม่สำเร็จ");
    }
  }

  useEffect(() => {
    if (Number.isFinite(id) && id > 0) load();
  }, [id]);

  const latestVisit = useMemo(() => {
    if (!item?.siteVisits?.length) return null;
    return item.siteVisits[item.siteVisits.length - 1]; // กันพลาดเลือกตัวท้ายสุด
  }, [item]);

  const latestQuotation = useMemo(() => {
    if (!item?.quotations?.length) return null;
    return item.quotations[0]; // สมมติ controller คืน desc แล้ว
  }, [item]);

  async function cancelRequest() {
    setBusyCancel(true);
    try {
      await apiPost(`/my/requests/${id}/cancel`, {});
      setConfirmCancel(false);
      await load();
      alert("ยกเลิกคำขอแล้ว");
    } catch (e) {
      alert(e?.response?.data?.message || "ยกเลิกไม่ได้");
    } finally {
      setBusyCancel(false);
    }
  }

  // กรณี path param ไม่ถูกต้อง
  if (!Number.isFinite(id) || id <= 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8 text-red-600">
        พารามิเตอร์ไม่ถูกต้อง
      </main>
    );
  }

  if (err)
    return (
      <main className="max-w-4xl mx-auto px-4 py-8 text-red-600">{err}</main>
    );
  if (!item)
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">กำลังโหลด…</main>
    );

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-2">
            <span>เลขอ้างอิง:</span>
            <span className="font-mono">{item.publicRef || `#${item.id}`}</span>
            <span className="mx-2">•</span>
            <span>ส่งเมื่อ {new Date(item.createdAt).toLocaleString("th-TH")}</span>
          </div>
        </div>
        <RequestStatusBadge status={item.status} />
      </div>

      {/* Actions top */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/my/requests"
          className="px-3 py-1.5 rounded border hover:bg-gray-50"
        >
          กลับรายการของฉัน
        </Link>
        {item.status === "NEW" && (
          <button
            className="px-3 py-1.5 rounded border text-red-600 hover:bg-red-50 disabled:opacity-60"
            onClick={() => setConfirmCancel(true)}
            disabled={busyCancel}
          >
            ยกเลิกคำขอ
          </button>
        )}
      </div>

      {/* Detail content */}
      <section className="rounded border p-4">
        <h2 className="font-medium">รายละเอียด</h2>
        <p className="mt-2 text-gray-800 whitespace-pre-wrap">
          {item.description}
        </p>
        <div className="mt-3 text-sm text-gray-600 space-y-1">
          {item.category?.name && <div>หมวด: {item.category.name}</div>}
          <div>
            สถานที่: {item.formattedAddress || item.placeName || item.addressLine || "-"}
          </div>
        </div>
      </section>

      {/* Images + uploader */}
      <section className="rounded border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">รูปภาพ</h2>
          <ImageUploaderInline
            requestId={item.id}
            onUploaded={(newImgs) =>
              setItem((x) => ({ ...x, images: [...(x.images || []), ...newImgs] }))
            }
          />
        </div>

        {!item.images?.length ? (
          <div className="mt-3 text-gray-600">ยังไม่มีรูป</div>
        ) : (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {item.images.map((img) => {
              const src = fileUrl(img.imageUrl);
              return (
                <a key={img.id} href={src} target="_blank" className="block" rel="noreferrer">
                  <img
                    src={src}
                    alt=""
                    className="w-full h-28 object-cover rounded border"
                  />
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Timeline */}
      <section className="rounded border p-4">
        <h2 className="font-medium">ไทม์ไลน์</h2>
        <div className="mt-3">
          <RequestTimeline request={item} />
        </div>
      </section>

      {/* Site-visit & Quotation */}
      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded border p-4">
          <h2 className="font-medium">นัดหมายดูหน้างาน</h2>
          <div className="mt-3">
            {latestVisit ? (
              <SiteVisitActionCard visit={latestVisit} onChanged={() => load()} />
            ) : (
              <div className="text-gray-600">ยังไม่มีนัดหมาย</div>
            )}
          </div>
        </section>

        <section className="rounded border p-4">
          <h2 className="font-medium">ใบเสนอราคา</h2>
          <div className="mt-3">
            <QuotationActionCard
              requestId={item.id}
              initialQuotation={latestQuotation || null}
            />
          </div>
        </section>
      </div>

      {/* Confirm cancel dialog */}
      <ConfirmDialog
        open={confirmCancel}
        title="ยืนยันยกเลิกคำขอ"
        message="ยกเลิกได้เฉพาะคำขอที่ยังเป็นสถานะ NEW เท่านั้น ดำเนินการต่อ?"
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancelRequest}
        confirmText="ยืนยันยกเลิก"
        cancelText="ปิด"
      />
    </main>
  );
}
