// frontend/src/app/admin/site-visits/page.js
"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import AdminGuard from "@/components/admin/AdminGuard";
import Table from "@/components/admin/Table";
import Modal from "@/components/admin/Modal";
import AdminDrawer from "@/components/admin/AdminDrawer";
import SiteVisitDetail from "@/components/admin/SiteVisitDetail";
import { toast, Toaster } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { VISIT_STATUS, VISIT_RESPONSE, renderBadge } from "@/lib/statusLabels";
import { Clipboard } from "lucide-react";
import { confirm } from "@/lib/dialogs"; // ✅ เพิ่ม SweetAlert helper
import "sweetalert2/dist/sweetalert2.min.css"; // ✅ เพิ่ม CSS ของ SweetAlert

function toLocalDatetimeValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// --- helper: แปลง input “Request ID หรือ PublicRef” เป็นเลข id (ถ้าแปลงได้) ---
function coerceRequestId(v) {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return String(Number(s)); // normalize leading zero
  // publicRef format: REQ-YYYYMM-00001 → id = 1 (เลขท้าย 5 หลัก)
  const m = /^REQ-\d{6}-(\d{5})$/i.exec(s);
  if (m) return String(Number(m[1]));
  return ""; // ไม่รู้จักรูปแบบ → ไม่ส่ง requestId ไป backend
}

export default function AdminSiteVisitsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRequestId = params?.get("requestId") || "";
  const autoNew = params?.get("autoNew") === "1";

  // ===== Filters =====
  const [status, setStatus] = useState("");
  const [quickDays, setQuickDays] = useState(14);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [q, setQ] = useState("");
  const [requestId, setRequestId] = useState(initialRequestId); // สำหรับกรณีมาจากลิงก์ (ยังแสดงที่ส่วนหัว)

  // ===== Data =====
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);

  // ===== Edit modal =====
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [when, setWhen] = useState(toLocalDatetimeValue());
  const [newStatus, setNewStatus] = useState("PENDING");
  const [saving, setSaving] = useState(false);

  // ===== Create modal =====
  const [openCreate, setOpenCreate] = useState(false);
  const [createRequestId, setCreateRequestId] = useState(initialRequestId);
  const [createWhen, setCreateWhen] = useState(toLocalDatetimeValue());
  const [creating, setCreating] = useState(false);

  // ===== Detail drawer =====
  const [openDetail, setOpenDetail] = useState(false);
  const [detailId, setDetailId] = useState(null);

  // ตัวเลือก “สถานะนัด”
  const visitStatusOptions = useMemo(
    () => [
      { value: "", label: "ทั้งหมด" },
      ...Object.entries(VISIT_STATUS).map(([value, def]) => ({
        value,
        label: def.label,
      })),
    ],
    []
  );

  // ทำ flag “นัดล่าสุดของคำขอ”
  const stampLatestFlag = useCallback((rows) => {
    const byReq = new Map();
    for (const r of rows) {
      const rid = r.request?.id;
      if (!rid) continue;
      const t = new Date(r.scheduledAt || 0).getTime();
      if (!byReq.has(rid) || t > byReq.get(rid).t) {
        byReq.set(rid, { t, id: r.id });
      }
    }
    return rows.map((r) => ({
      ...r,
      isLatestForRequest:
        !!r.request?.id && byReq.get(r.request.id)?.id === r.id,
    }));
  }, []);

  // โหลดข้อมูล (รวม logic แยกแยะ q เป็น text หรือ publicRef/ID)
  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const p = { page, pageSize: 10 };
        if (status) p.status = status;

        // ใช้ช่องเดียว: ถ้า q เป็น ID/REF → ส่งเป็น requestId, ถ้าเป็นข้อความ → ส่ง q
        const kw = q.trim();
        if (kw) {
          if (/^REQ-\d{6}-\d{5}$/i.test(kw)) {
            p.requestId = String(Number(kw.slice(-5)));
          } else if (/^\d+$/.test(kw)) {
            p.requestId = String(Number(kw));
          } else {
            p.q = kw;
          }
        }

        // รองรับ requestId จาก query string (เช่นมาจากหน้า RequestDetail)
        const ridFromParam = coerceRequestId(requestId);
        if (ridFromParam && !p.requestId) p.requestId = ridFromParam;

        if (useCustomRange) {
          if (dateFrom) p.dateFrom = dateFrom;
          if (dateTo) p.dateTo = dateTo;
        } else {
          p.days = quickDays;
        }

        console.log("[FE] load site-visits params =", p);
        const { data } = await apiGet("/admin/site-visits/upcoming", p);
        const rows = data?.data || [];
        console.log("[FE] loaded site-visits count =", rows.length);
        setItems(stampLatestFlag(rows));
        setMeta(data?.meta || { page, pageSize: 10, total: 0 });

        // กรณีมากับ requestId & autoNew=1 แล้ว “ยังไม่มีนัด” → เปิดสร้างอัตโนมัติ
        if (page === 1 && autoNew && (p.requestId || ridFromParam) && rows.length === 0) {
          const ridToUse = p.requestId || ridFromParam;
          console.log("[FE] autoNew=1 → open create modal (no visits yet)");
          setCreateRequestId(ridToUse); // เก็บเป็นเลข id ที่ normalize แล้ว
          setCreateWhen(toLocalDatetimeValue(new Date(Date.now() + 24 * 3600 * 1000))); // +1 วัน
          setOpenCreate(true);
        }
      } catch (e) {
        console.error("[FE] site-visits load failed:", e?.response?.data || e?.message);
        setItems([]);
        setMeta({ page: 1, pageSize: 10, total: 0 });
      } finally {
        setLoading(false);
      }
    },
    [
      status,
      q,
      requestId,
      useCustomRange,
      dateFrom,
      dateTo,
      quickDays,
      autoNew,
      stampLatestFlag,
    ]
  );

  // initial load
  useEffect(() => {
    load(1);
    if (initialRequestId && autoNew) {
      console.log("[FE] initial autoNew=1 → will open create modal if no visits after load");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enter เพื่อค้นหาเร็ว
  const onKeyDownSearch = (e) => {
    if (e.key === "Enter") load(1);
  };

  const columns = useMemo(
    () => [
      { header: "ID", key: "id", width: 64, headerClassName: "w-16" },
      {
        header: "คำขอ",
        render: (r) => {
          const ref = r.request?.publicRef || (r.request?.id ? `#${r.request.id}` : "-");
          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{ref}</span>
                {!!r.request?.publicRef && (
                  <button
                    className="p-1 rounded hover:bg-gray-100"
                    title="คัดลอกเลขอ้างอิง"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      navigator.clipboard.writeText(r.request.publicRef);
                      toast.success("คัดลอกเลขอ้างอิงแล้ว");
                    }}
                  >
                    <Clipboard size={14} />
                  </button>
                )}
              </div>
              <span className="text-sm text-gray-800">{r.request?.title || "-"}</span>
              <span className="text-xs text-gray-500">
                ลูกค้า:{" "}
                {r.request?.customer
                  ? `${r.request.customer.firstName} ${r.request.customer.lastName}`
                  : "-"}
              </span>
            </div>
          );
        },
      },
      {
        header: "วัน–เวลา",
        render: (r) => (
          <div className="flex items-center gap-2">
            <span>
              {r.scheduledAt
                ? new Date(r.scheduledAt).toLocaleString("th-TH", {
                    timeZone: "Asia/Bangkok",
                  })
                : "-"}
            </span>
            {r.isLatestForRequest && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800"
                title="นัดล่าสุดของคำขอนี้ (ตามวัน–เวลา)"
              >
                ล่าสุด
              </span>
            )}
          </div>
        ),
      },
      {
        header: "สถานะนัด",
        render: (r) => renderBadge(VISIT_STATUS, r.status),
        cellClassName: "whitespace-nowrap",
      },
      {
        header: "การตอบลูกค้า",
        render: (r) =>
          renderBadge(VISIT_RESPONSE, r.customerResponse || "PENDING"),
        cellClassName: "whitespace-nowrap",
      },
      {
        header: "การทำงาน",
        render: (r) => (
          <div className="flex flex-wrap gap-2">
            <button
              className="px-2 py-1 rounded border hover:bg-gray-50"
              onClick={() => {
                setDetailId(r.id);
                setOpenDetail(true);
              }}
              title="ดูรายละเอียด"
            >
              ดูรายละเอียด
            </button>
            <button
              className="px-2 py-1 rounded border hover:bg-gray-50"
              onClick={(ev) => {
                ev.stopPropagation();
                setSelected(r);
                setWhen(toLocalDatetimeValue(new Date(r.scheduledAt)));
                setNewStatus(r.status);
                setOpenEdit(true);
              }}
              title="แก้ไขวันเวลา/สถานะนัด"
            >
              แก้ไข
            </button>
            <button
              className="px-2 py-1 rounded border hover:bg-gray-50"
              onClick={(ev) => {
                ev.stopPropagation();
                router.push(`/admin/quotations?requestId=${r.request?.id}`);
              }}
              title="ไปหน้าใบเสนอราคาของคำขอนี้"
            >
              ใบเสนอราคา
            </button>
          </div>
        ),
      },
    ],
    [router]
  );

  const onSave = async () => {
    if (!selected) return;

    // ✅ SweetAlert: ยืนยันก่อนบันทึกการแก้ไข
    const { isConfirmed } = await confirm({
      title: "บันทึกการแก้นัดหมาย?",
      text: "ยืนยันการอัปเดตวัน–เวลาหรือสถานะของนัดนี้",
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
    });
    if (!isConfirmed) return;

    setSaving(true);
    try {
      const payload = {};
      if (when) payload.scheduledAt = new Date(when).toISOString();
      if (newStatus) payload.status = newStatus;
      console.log("[FE] PATCH /admin/site-visits/%s payload=", selected.id, payload);
      await apiPatch(`/admin/site-visits/${selected.id}`, payload);
      toast.success("บันทึกการแก้ไขแล้ว");
      setOpenEdit(false);
      await load(meta.page);
    } catch (e) {
      console.error("[FE] update failed:", e?.response?.data || e?.message);
      toast.error(e?.response?.data?.message || "อัปเดตไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const onCreate = async () => {
    // ✅ SweetAlert: ยืนยันก่อนสร้างนัดใหม่
    const { isConfirmed } = await confirm({
      title: "สร้างนัดหมายใหม่?",
      text: "คุณแน่ใจหรือไม่ที่จะสร้างนัดหมายใหม่นี้",
      confirmButtonText: "สร้างนัด",
      cancelButtonText: "ยกเลิก",
    });
    if (!isConfirmed) return;

    setCreating(true);
    try {
      const rid = coerceRequestId(createRequestId);
      if (!rid) {
        toast.error("กรุณาระบุ Request ID (เลข) หรือเลขอ้างอิงรูปแบบ REQ-YYYYMM-00001");
        setCreating(false);
        return;
      }
      const payload = {
        requestId: Number(rid),
        scheduledAt: new Date(createWhen).toISOString(),
      };
      console.log("[FE] POST /admin/site-visits payload=", payload);
      await apiPost("/admin/site-visits", payload);
      toast.success("สร้างนัดหมายสำเร็จ");
      setOpenCreate(false);
      setCreateWhen(toLocalDatetimeValue());
      await load(1);
    } catch (e) {
      console.error("[FE] create failed:", e?.response?.data || e?.message);
      toast.error(e?.response?.data?.message || "สร้างนัดไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.pageSize || 10)));

  return (
    <AdminGuard>
      <Toaster richColors />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">ปฏิทินนัดหมายหน้างาน</h1>
          {requestId ? (
            <div className="text-sm text-gray-600">
              กรองตามคำขอ: <span className="font-mono">{requestId}</span>
            </div>
          ) : null}
        </div>

        {/* Filters */}
        <div className="rounded-lg border p-3">
          <div className="grid md:grid-cols-3 gap-3">
            {/* สถานะนัด */}
            <label className="block">
              <div className="text-xs text-gray-600 mb-1">สถานะนัด</div>
              <select
                className="border rounded px-3 py-2 w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {visitStatusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {/* ช่วงเวลา */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id="useCustom"
                  type="checkbox"
                  checked={useCustomRange}
                  onChange={(e) => setUseCustomRange(e.target.checked)}
                />
                <label htmlFor="useCustom" className="text-sm">
                  กำหนดช่วงวันเอง
                </label>
              </div>
              {useCustomRange ? (
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="border rounded px-2 py-1 w-full"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <input
                    type="date"
                    className="border rounded px-2 py-1 w-full"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      className={`px-3 py-1.5 rounded border ${
                        quickDays === d ? "bg-gray-900 text-white" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setQuickDays(d)}
                    >
                      {d} วัน
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ค้นหา (ช่องเดียว ครอบคลุม ID/เลขอ้างอิง/ข้อความ) */}
            <label className="block md:col-span-3">
              <div className="text-xs text-gray-600 mb-1">
                ค้นหา (หัวข้อคำขอ/ชื่อลูกค้า/เลขอ้างอิง/Request ID)
              </div>
              <input
                className="border rounded px-3 py-2 w-full"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") load(1);
                }}
                placeholder="พิมพ์คำค้น เช่น REQ-202510-00001 หรือชื่อ/คำขอ แล้วกด Enter"
              />
            </label>
          </div>

          <div className="flex justify-between mt-3">
            <button
              className="px-3 py-2 rounded border"
              onClick={() => {
                setStatus("");
                setQuickDays(14);
                setUseCustomRange(false);
                setDateFrom("");
                setDateTo("");
                setQ("");
                setRequestId(initialRequestId || "");
              }}
              title="ล้างตัวกรองทั้งหมด"
            >
              ล้างตัวกรอง
            </button>

            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded border"
                onClick={() => setOpenCreate(true)}
                title="สร้างนัดใหม่"
              >
                สร้างนัดใหม่
              </button>
              <button
                className="px-3 py-2 rounded bg-black text-white"
                onClick={() => load(1)}
                title="ค้นหา"
              >
                ค้นหา
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? <p>กำลังโหลด...</p> : <Table columns={columns} data={items} />}

        {/* Pagination */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-gray-600">
            {meta.total} รายการ • หน้า {meta.page} / {Math.max(
              1,
              Math.ceil((meta.total || 0) / (meta.pageSize || 10))
            )}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={meta.page <= 1}
            onClick={() => load(meta.page - 1)}
          >
            ก่อนหน้า
          </button>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={meta.page >= Math.max(1, Math.ceil((meta.total || 0) / (meta.pageSize || 10)))}
            onClick={() => load(meta.page + 1)}
          >
            ถัดไป
          </button>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="สร้างนัดดูหน้างาน"
        footer={
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded border" onClick={() => setOpenCreate(false)}>
              ยกเลิก
            </button>
            <button
              className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
              disabled={creating}
              onClick={onCreate}
            >
              {creating ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <div className="text-sm text-gray-600 mb-1">Request ID หรือเลขอ้างอิง</div>
            <input
              className="border rounded px-3 py-2 w-full"
              value={createRequestId}
              onChange={(e) => setCreateRequestId(e.target.value)}
              placeholder="เช่น 123 หรือ REQ-202510-00012"
              inputMode="text"
            />
            {initialRequestId && (
              <p className="text-xs text-gray-500 mt-1">
                * มาจากหน้า RequestDetail: #{initialRequestId}
              </p>
            )}
          </label>

          <label className="block">
            <div className="text-sm text-gray-600 mb-1">วัน–เวลา (เวลาไทย)</div>
            <input
              type="datetime-local"
              className="border rounded px-3 py-2 w-full"
              value={createWhen}
              onChange={(e) => setCreateWhen(e.target.value)}
            />
          </label>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        title={`แก้นัดหมาย #${selected?.id ?? "-"}`}
        footer={
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded border" onClick={() => setOpenEdit(false)}>
              ยกเลิก
            </button>
            <button
              className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-600">คำขอ</div>
          <div className="font-medium">
            {(selected?.request?.publicRef || `#${selected?.request?.id ?? "-"}`)} — {selected?.request?.title}
          </div>

          <label className="block">
            <div className="text-sm text-gray-600 mb-1">วัน–เวลา (เวลาไทย)</div>
            <input
              type="datetime-local"
              className="border rounded px-3 py-2 w-full"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600 mb-1">สถานะนัด</div>
            <select
              className="border rounded px-3 py-2 w-full"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="PENDING">{VISIT_STATUS.PENDING.label}</option>
              <option value="DONE">{VISIT_STATUS.DONE.label}</option>
              <option value="CANCELLED">{VISIT_STATUS.CANCELLED.label}</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              * ถ้าเลือก <b>ดูหน้างานแล้ว</b> ระบบจะซิงก์คำขอเป็น <b>SURVEY_DONE</b>.{" "}
              ถ้าเลือก <b>ยกเลิกนัด</b> คำขอจะเป็น <b>REJECTED</b>.
            </p>
          </label>
        </div>
      </Modal>

      {/* Detail Drawer */}
      <AdminDrawer
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        title={`รายละเอียดนัดหมาย #${detailId ?? "-"}`}
        widthClass="w-full max-w-3xl"
      >
        {detailId && (
          <SiteVisitDetail
            visitId={detailId}
            onEdit={(v) => {
              setSelected(v);
              setWhen(toLocalDatetimeValue(new Date(v.scheduledAt)));
              setNewStatus(v.status);
              setOpenDetail(false);
              setOpenEdit(true);
            }}
            onGoUploadQuotation={(req) => {
              setOpenDetail(false);
              router.push(`/admin/quotations?requestId=${req?.id}`);
            }}
            onGoRequest={(rid) => {
              setOpenDetail(false);
              router.push(`/admin/requests?focusId=${rid}`);
            }}
          />
        )}
      </AdminDrawer>
    </AdminGuard>
  );
}
