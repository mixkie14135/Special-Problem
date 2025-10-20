// frontend/src/components/admin/SiteVisitDetail.jsx
"use client";
import { useEffect, useState, useMemo } from "react";
import { apiGet } from "@/lib/api";
import { fileUrl } from "@/lib/urls";
import {
  VISIT_STATUS,
  VISIT_RESPONSE,
  REQUEST_STATUS,
  renderBadge,
} from "@/lib/statusLabels";

export default function SiteVisitDetail({
  visitId,
  onEdit = () => {},
  onGoUploadQuotation = () => {},
  onGoRequest = () => {},
}) {
  const [loading, setLoading] = useState(true);
  const [visit, setVisit] = useState(null);

  const canUploadQuotation = useMemo(() => {
    if (!visit?.request) return false;
    // แนวทาง UX: ให้อัปโหลดได้เมื่อสถานะนัดเป็น DONE (ดูหน้างานเรียบร้อย)
    return visit.status === "DONE";
  }, [visit]);

  useEffect(() => {
    if (!visitId) return;
    (async () => {
      setLoading(true);
      try {
        // Admin detail
        const { data } = await apiGet(`/admin/site-visits/${visitId}`);
        setVisit(data?.data || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [visitId]);

  if (loading) return <div>กำลังโหลดรายละเอียดนัด…</div>;
  if (!visit) return <div className="text-red-600">ไม่พบนัดหมาย #{visitId}</div>;

  const r = visit.request;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-600">นัดหมาย #{visit.id}</div>
          <h2 className="text-xl font-semibold">
            {r ? `#${r.id} — ${r.title}` : "-"}
          </h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {renderBadge(VISIT_STATUS, visit.status)}
            {renderBadge(
              VISIT_RESPONSE,
              visit.customerResponse || "PENDING"
            )}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            เวลา:{" "}
            {visit.scheduledAt
              ? new Date(visit.scheduledAt).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Bangkok",
                })
              : "-"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-2 rounded border hover:bg-gray-50"
            onClick={() => onEdit?.(visit)}
            title="แก้ไขวันเวลา/สถานะ"
          >
            แก้ไขนัดหมาย
          </button>
          <button
            className="px-3 py-2 rounded border hover:bg-gray-50"
            onClick={() => onGoRequest?.(r?.id)}
            disabled={!r?.id}
            title="ไปหน้ารายละเอียดคำขอ"
          >
            ไปคำขอ
          </button>
          <button
            className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
            disabled={!canUploadQuotation || !r?.id}
            onClick={() => onGoUploadQuotation?.(r)}
            title={
              canUploadQuotation
                ? "ไปอัปโหลดใบเสนอราคาของคำขอนี้"
                : "ต้องเปลี่ยนสถานะนัดเป็น DONE ก่อน"
            }
          >
            อัปโหลดใบเสนอราคา
          </button>
        </div>
      </div>

      {/* คำขอที่เกี่ยวข้อง */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">คำขอที่เกี่ยวข้อง</div>
        {r ? (
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                #{r.id} — {r.title}
              </span>
              {renderBadge(REQUEST_STATUS, r.status)}
            </div>
            <div className="text-gray-600">
              ที่อยู่: {r.formattedAddress || r.placeName || "-"}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">— ไม่มีข้อมูลคำขอ —</div>
        )}
      </div>

      {/* ลูกค้า */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">ลูกค้า</div>
        {r?.customer ? (
          <div className="text-sm space-y-1">
            <div>
              ชื่อ: {r.customer.firstName} {r.customer.lastName}
            </div>
            <div>โทร: {r.customer.phone || "-"}</div>
            <div>อีเมล: {r.customer.email || "-"}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">— ไม่มีข้อมูลลูกค้า —</div>
        )}
      </div>

      {/* โน้ต/การตอบของลูกค้า */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">การตอบจากลูกค้า</div>
        <div className="text-sm space-y-1">
          <div>
            สถานะการตอบ:{" "}
            {renderBadge(VISIT_RESPONSE, visit.customerResponse || "PENDING")}
          </div>
          <div>หมายเหตุจากลูกค้า: {visit.customerNote || "-"}</div>
          <div>
            เวลาตอบ:{" "}
            {visit.respondedAt
              ? new Date(visit.respondedAt).toLocaleString("th-TH")
              : "-"}
          </div>
        </div>
      </div>

      {/* รูปจากคำขอ (ถ้ามี) */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">รูปจากคำขอ</div>
        {r?.images?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {r.images.map((im) => (
              <a
                key={im.id}
                href={fileUrl(im.imageUrl)}
                target="_blank"
                rel="noreferrer"
                className="block rounded overflow-hidden border"
                title="เปิดภาพเต็ม"
              >
                <img
                  src={fileUrl(im.imageUrl)}
                  alt=""
                  className="w-full h-40 object-cover"
                />
              </a>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">— ไม่มีรูปแนบ —</div>
        )}
      </div>
    </div>
  );
}
