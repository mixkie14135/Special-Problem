// src/components/admin/RequestDetail.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { fileUrl } from "@/lib/urls";
import {
  REQUEST_STATUS,
  VISIT_STATUS,
  QUOTE_STATUS,
  renderBadge,
} from "@/lib/statusLabels";

export default function RequestDetail({
  requestId,
  onUploadQuotation = () => {},
  onGotoSiteVisits = () => {},
}) {
  const [loading, setLoading] = useState(true);
  const [reqData, setReqData] = useState(null);
  const [latestQuote, setLatestQuote] = useState(null);
  const [upcomingVisits, setUpcomingVisits] = useState([]);

  // ===== แนวทาง A =====
  const canCreateQuote = useMemo(() => {
    return reqData?.status === "SURVEY_DONE" && !latestQuote;
  }, [reqData, latestQuote]);

  const canEditQuote = useMemo(() => {
    return !!latestQuote && latestQuote.status === "PENDING";
  }, [latestQuote]);

  const quoteButtonEnabled = canCreateQuote || canEditQuote;
  const quoteButtonLabel = canEditQuote ? "แก้ไขใบเสนอราคา" : "ส่งใบเสนอราคา";
  const quoteButtonTitle = quoteButtonEnabled
    ? (canEditQuote ? "อัปโหลดไฟล์ใหม่เพื่อทับของเดิม" : "อัปโหลดใบเสนอราคา (ครั้งแรก)")
    : (!latestQuote
        ? "ต้องสถานะ 'ดูหน้างานเสร็จ' ก่อน"
        : "ไม่สามารถแก้ไขได้ (ลูกค้าตอบแล้ว)");

  useEffect(() => {
    if (!requestId) return;

    (async () => {
      setLoading(true);

      // 1) รายละเอียดคำขอ
      try {
        const { data: r1 } = await apiGet(`/requests/${requestId}`);
        setReqData(r1?.data || null);
      } catch {
        setReqData(null);
      }

      // 2) ใบเสนอราคาล่าสุด (404 = ยังไม่มี)
      try {
        const { data: r2 } = await apiGet(`/quotations/${requestId}`, { latest: true });
        setLatestQuote(r2?.data || null);
      } catch (e) {
        setLatestQuote(null);
      }

      // 3) นัดหมายที่จะถึง
      try {
        const { data: r3 } = await apiGet(`/admin/site-visits/upcoming`, {
          requestId,
          days: 365,
          page: 1,
          pageSize: 50,
        });
        setUpcomingVisits(r3?.data || []);
      } catch {
        setUpcomingVisits([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  if (loading) return <div>กำลังโหลดรายละเอียด…</div>;
  if (!reqData) return <div className="text-red-600">ไม่พบคำขอ #{requestId}</div>;

  const {
    title,
    description,
    status,
    category,
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
    formattedAddress,
    placeName,
    district,
    province,
    postalCode,
    images = [],
    customer,
    createdAt,
  } = reqData;

  const contactName = [contactFirstName, contactLastName].filter(Boolean).join(" ").trim();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-600">คำขอ #{requestId}</div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <div className="mt-1">{renderBadge(REQUEST_STATUS, status)}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* ปุ่มนัดดูหน้างาน: ถ้ายังไม่มีนัด ให้เปิดสร้างอัตโนมัติ (autoNew=1) */}
          <a
            className="px-3 py-2 rounded border hover:bg-gray-50"
            href={
              `/admin/site-visits?requestId=${requestId}` +
              (upcomingVisits.length === 0 ? `&autoNew=1` : ``)
            }
            title="ไปยังหน้านัดหมายของคำขอนี้"
          >
            นัดดูหน้างาน
          </a>

          {/* แนวทาง A: ส่งครั้งแรกเฉพาะ SURVEY_DONE, แก้ไขได้เฉพาะใบ PENDING */}
          <button
            className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
            disabled={!quoteButtonEnabled}
            onClick={() =>
              onUploadQuotation?.(reqData, {
                isEdit: !!latestQuote,
                latestQuoteStatus: latestQuote?.status,
              })
            }
            title={quoteButtonTitle}
          >
            {quoteButtonLabel}
          </button>
        </div>
      </div>

      {/* Customer & Contact */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-3">
          <div className="font-medium mb-2">ผู้ติดต่อ</div>
          <div className="text-sm">
            <div>ชื่อ: {contactName || "-"}</div>
            <div>โทร: {contactPhone || "-"}</div>
            <div>อีเมล: {contactEmail || "-"}</div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="font-medium mb-2">ข้อมูลคำขอ</div>
          <div className="text-sm">
            <div>หมวดบริการ: {category?.name || "-"}</div>
            <div>สร้างเมื่อ: {createdAt ? new Date(createdAt).toLocaleString("th-TH") : "-"}</div>
            {customer?.email && (
              <div>
                ลูกค้า: {customer.firstName} {customer.lastName} ({customer.email})
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">ที่อยู่/สถานที่</div>
        <div className="text-sm space-y-1">
          <div>{formattedAddress || placeName || "-"}</div>
          <div className="text-gray-600">
            {[district, province, postalCode].filter(Boolean).join(" ")}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">รายละเอียดงาน</div>
        <div className="text-sm whitespace-pre-wrap">{description || "-"}</div>
      </div>

      {/* Images */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">รูปที่แนบ</div>
        {images?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((im) => (
              <a
                key={im.id}
                href={fileUrl(im.imageUrl)}
                target="_blank"
                rel="noreferrer"
                className="block rounded overflow-hidden border"
                title="เปิดภาพเต็ม"
              >
                <img src={fileUrl(im.imageUrl)} alt="" className="w-full h-40 object-cover" />
              </a>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">— ไม่มีรูปแนบ —</div>
        )}
      </div>

      {/* Upcoming Site Visits */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">นัดหมายที่จะถึง</div>
        {!upcomingVisits.length ? (
          <div className="text-sm text-gray-500">— ยังไม่มีนัดที่จะถึง —</div>
        ) : (
          <div className="space-y-2">
            {upcomingVisits.map((v) => (
              <div key={v.id} className="rounded border p-2 flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">
                    {new Date(v.scheduledAt).toLocaleString("th-TH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                  <div className="text-gray-600">
                    ลูกค้า:{" "}
                    {v.request?.customer
                      ? `${v.request.customer.firstName} ${v.request.customer.lastName}`
                      : "-"}
                  </div>
                </div>
                <div className="flex gap-2">{renderBadge(VISIT_STATUS, v.status)}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-xs text-gray-500">
          * แสดงเฉพาะนัด “ที่จะถึง” (อิง <code>/admin/site-visits/upcoming</code>)
        </div>
      </div>

      {/* Latest Quotation */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">ใบเสนอราคาล่าสุด</div>
        {!latestQuote ? (
          <div className="text-sm text-gray-500">— ยังไม่มีใบเสนอราคา —</div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-medium">#ใบเสนอราคา {latestQuote.id}</div>
              <div>สถานะ: {renderBadge(QUOTE_STATUS, latestQuote.status)}</div>
              <div>
                ยอดรวม:{" "}
                {latestQuote.totalPrice != null
                  ? new Intl.NumberFormat("th-TH").format(latestQuote.totalPrice) + " บาท"
                  : "-"}
              </div>
              <div>
                ใช้ได้ถึง:{" "}
                {latestQuote.validUntil
                  ? new Date(latestQuote.validUntil).toLocaleDateString("th-TH")
                  : "-"}
              </div>

              {latestQuote.status === "PENDING" ? (
                <div className="text-xs text-amber-700 mt-1">
                  * ยังแก้ไขไฟล์ใบเสนอราคาได้จนกว่าลูกค้าจะตอบรับ/ปฏิเสธ
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-1">
                  * ใบเสนอราคาอยู่ในสถานะ{" "}
                  {latestQuote.status === "APPROVED" ? "ลูกค้าตกลง" : "ปฏิเสธ"} — ไม่สามารถแก้ไขได้
                </div>
              )}
            </div>
            <div>
              {latestQuote.fileUrl ? (
                <a
                  href={fileUrl(latestQuote.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded border hover:bg-gray-50"
                >
                  เปิดไฟล์
                </a>
              ) : (
                <span className="text-xs text-gray-500">ไม่มีไฟล์แนบ</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
