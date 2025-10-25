// src/components/admin/RequestDetail.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { fileUrl } from "@/lib/urls";
import {
  REQUEST_STATUS,
  VISIT_STATUS,
  QUOTE_STATUS,
  VISIT_RESPONSE,     // ✅ เพิ่ม
  renderBadge,
} from "@/lib/statusLabels";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

/* ===== Google Map ===== */
const MAP_LIBRARIES = ["places"];

/* ===== Helpers ===== */
async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("load error " + path);
  return res.json();
}

export default function RequestDetail({
  requestId,
  onUploadQuotation = () => {},
  onGotoSiteVisits = () => {},
}) {
  const [loading, setLoading] = useState(true);
  const [reqData, setReqData] = useState(null);
  const [latestQuote, setLatestQuote] = useState(null);
  const [upcomingVisits, setUpcomingVisits] = useState([]);

  // Map loader
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBRARIES,
  });

  // Datasets for converting codes → Thai names
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subdistricts, setSubdistricts] = useState([]);

  // ==== Load datasets (one-time) ====
  useEffect(() => {
    (async () => {
      try {
        console.log("[FE] loading TH datasets (provinces/districts/subdistricts) …");
        const [p, d, s] = await Promise.all([
          loadJson("/data/provinces.json"),
          loadJson("/data/districts.json"),
          loadJson("/data/subdistricts.json"),
        ]);
        setProvinces(p);
        setDistricts(d);
        setSubdistricts(s);
        console.log(
          "[FE] datasets loaded:",
          { provinces: p.length, districts: d.length, subdistricts: s.length }
        );
      } catch (e) {
        console.error("[FE] datasets load failed:", e?.message || e);
        setProvinces([]);
        setDistricts([]);
        setSubdistricts([]);
      }
    })();
  }, []);

  // ==== Permission to quote ====
  const canCreateQuote = useMemo(
    () => reqData?.status === "SURVEY_DONE" && !latestQuote,
    [reqData, latestQuote]
  );
  const canEditQuote = useMemo(
    () => !!latestQuote && latestQuote.status === "PENDING",
    [latestQuote]
  );
  const quoteButtonEnabled = canCreateQuote || canEditQuote;
  const quoteButtonLabel = canEditQuote ? "แก้ไขใบเสนอราคา" : "ส่งใบเสนอราคา";
  const quoteButtonTitle = quoteButtonEnabled
    ? canEditQuote
      ? "อัปโหลดไฟล์ใหม่เพื่อทับของเดิม"
      : "อัปโหลดใบเสนอราคา (ครั้งแรก)"
    : !latestQuote
    ? "ต้องสถานะ 'ดูหน้างานเสร็จ' ก่อน"
    : "ไม่สามารถแก้ไขได้ (ลูกค้าตอบแล้ว)";

  // ==== Load main data ====
  useEffect(() => {
    if (!requestId) return;
    (async () => {
      setLoading(true);
      console.log("========== [FE] Admin RequestDetail load start ==========");
      console.log("[FE] requestId =", requestId);

      // 1) Request detail
      try {
        console.log("[FE] GET /requests/%s", requestId);
        const { data: r1 } = await apiGet(`/requests/${requestId}`);
        console.log("[FE] /requests response:", r1?.status, r1?.data);
        setReqData(r1?.data || null);
      } catch (e) {
        console.error(
          "[FE] /requests/:id failed",
          e?.response?.status,
          e?.response?.data || e?.message
        );
        setReqData(null);
      }

      // 2) Latest quotation (404 is normal if not exists)
      try {
        console.log("[FE] GET /quotations/%s?latest=true", requestId);
        const { data: r2 } = await apiGet(`/quotations/${requestId}`, {
          latest: true,
        });
        console.log("[FE] /quotations latest response:", r2?.status, r2?.data);
        setLatestQuote(r2?.data || null);
      } catch (e) {
        if (e?.response?.status === 404) {
          console.log("[FE] no latest quotation (expected 404)");
        } else {
          console.error(
            "[FE] /quotations latest failed",
            e?.response?.status,
            e?.response?.data || e?.message
          );
        }
        setLatestQuote(null);
      }

      // 3) Upcoming site-visits
      try {
        console.log("[FE] GET /admin/site-visits/upcoming", {
          requestId,
          days: 365,
          page: 1,
          pageSize: 50,
        });
        const { data: r3 } = await apiGet(`/admin/site-visits/upcoming`, {
          requestId,
          days: 365,
          page: 1,
          pageSize: 50,
        });
        console.log(
          "[FE] /admin/site-visits/upcoming response:",
          r3?.status,
          Array.isArray(r3?.data) ? `items=${r3.data.length}` : r3?.data
        );
        setUpcomingVisits(r3?.data || []);
      } catch (e) {
        console.error(
          "[FE] /admin/site-visits/upcoming failed",
          e?.response?.status,
          e?.response?.data || e?.message
        );
        setUpcomingVisits([]);
      }

      console.log("========== [FE] Admin RequestDetail load end ==========");
      setLoading(false);
    })();
  }, [requestId]);

  if (loading) return <div>กำลังโหลดรายละเอียด…</div>;
  if (!reqData) return <div className="text-red-600">ไม่พบคำขอ #{requestId}</div>;

  const {
    publicRef,
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
    addressLine,
    district,
    province,
    subdistrict,
    postalCode,
    latitude,
    longitude,
    images = [],
    customer,
    createdAt,
  } = reqData;

  const contactName = [contactFirstName, contactLastName].filter(Boolean).join(" ");

  // Convert codes → Thai names for display
  const provinceName =
    provinces.find((x) => x.provinceCode == province)?.provinceNameTh || province;
  const districtName =
    districts.find((x) => x.districtCode == district)?.districtNameTh || district;
  const subdistrictName =
    subdistricts.find((x) => x.subdistrictCode == subdistrict)?.subdistrictNameTh ||
    subdistrict;

  const fullAddress = [
    placeName,
    addressLine,
    subdistrictName && "ต." + subdistrictName,
    districtName && "อ." + districtName,
    provinceName && "จ." + provinceName,
    postalCode,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-600">
            เลขอ้างอิง: <span className="font-mono">{publicRef || `#${requestId}`}</span>
          </div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <div className="mt-1">{renderBadge(REQUEST_STATUS, status)}</div>
          <div className="text-xs text-gray-500 mt-1">
            สร้างเมื่อ {createdAt ? new Date(createdAt).toLocaleString("th-TH") : "-"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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

      {/* Contact / Request info */}
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
            {customer?.email && (
              <div>
                ลูกค้า: {customer.firstName} {customer.lastName} ({customer.email})
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      {isLoaded && latitude && longitude ? (
        <div className="rounded-lg border p-3">
          <div className="font-medium mb-2">ตำแหน่งที่ลูกค้าปักหมุด</div>
          <div className="h-72 border rounded">
            <GoogleMap
              center={{ lat: Number(latitude), lng: Number(longitude) }}
              zoom={15}
              mapContainerStyle={{ width: "100%", height: "100%" }}
              onLoad={() => console.log("[FE] GoogleMap loaded")}
            >
              <Marker position={{ lat: Number(latitude), lng: Number(longitude) }} />
            </GoogleMap>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            พิกัด: {latitude}, {longitude}
          </div>
        </div>
      ) : null}

      {/* Address */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">ที่อยู่/สถานที่</div>
        <div className="text-sm">
          {formattedAddress ? (
            <>
              <div>{formattedAddress}</div>
              {fullAddress && fullAddress !== formattedAddress ? (
                <div className="text-gray-600 mt-1">{fullAddress}</div>
              ) : null}
            </>
          ) : (
            <div>{fullAddress || "-"}</div>
          )}
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

      {/* Upcoming Site Visits */}
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-2">นัดหมายที่จะถึง</div>
        {!upcomingVisits.length ? (
          <div className="text-sm text-gray-500">— ยังไม่มีนัดที่จะถึง —</div>
        ) : (
          <div className="space-y-2">
            {upcomingVisits.map((v) => (
              <div
                key={v.id}
                className="rounded border p-2 flex items-center justify-between"
              >
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

                {/* ✅ แสดงแบดจ์สถานะนัด + การตอบลูกค้า */}
                <div className="flex items-center gap-2">
                  {renderBadge(VISIT_STATUS, v.status)}
                  {renderBadge(VISIT_RESPONSE, v.customerResponse || "PENDING")}
                </div>
              </div>
            ))}
          </div>
        )}
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
                  ? new Intl.NumberFormat("th-TH").format(latestQuote.totalPrice) +
                    " บาท"
                  : "-"}
              </div>
              <div>
                ใช้ได้ถึง:{" "}
                {latestQuote.validUntil
                  ? new Date(latestQuote.validUntil).toLocaleDateString("th-TH")
                  : "-"}
              </div>
            </div>
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
        )}
      </div>
    </div>
  );
}

