// frontend/src/app/admin/requests/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import AdminGuard from "@/components/admin/AdminGuard";
import Table from "@/components/admin/Table";
import Modal from "@/components/admin/Modal";
import AdminDrawer from "@/components/admin/AdminDrawer";
import RequestDetail from "@/components/admin/RequestDetail";
import { toast, Toaster } from "sonner";
import { REQUEST_STATUS, renderBadge } from "@/lib/statusLabels";
import { Clipboard } from "lucide-react";

export default function AdminRequestsPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("createdAt:desc");

  // ทำ option สถานะไทย (ค่าเป็น key อังกฤษ)
  const statusOptions = useMemo(
    () =>
      Object.entries(REQUEST_STATUS).map(([value, def]) => ({
        value,
        label: def.label,
      })),
    []
  );

  // upload quotation modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [targetReq, setTargetReq] = useState(null);
  const [file, setFile] = useState(null);
  const [price, setPrice] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [uploading, setUploading] = useState(false);

  // detail drawer
  const [openDetail, setOpenDetail] = useState(false);
  const [detailId, setDetailId] = useState(null);

  // FE gate แบบหลวม (ยังคงตรวจจริงที่ BE)
  const canShowQuoteButton = (r) => r.status === "SURVEY_DONE";

  async function fetchData(page = 1) {
    setLoading(true);
    try {
      const { data } = await apiGet("/admin/requests/recent", {
        page,
        pageSize: meta.pageSize || 10,
        q,
        status,
        sort,
      });
      setItems(data?.data || []);
      setMeta(data?.meta || { page, pageSize: 10, total: 0 });
    } catch (e) {
      toast.error(e?.response?.data?.message || "โหลดรายการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Pre-check ก่อนเปิด modal อัปโหลดใบเสนอราคา -----
  // ต้องมีนัดล่าสุด + ลูกค้า APPROVED + นัด DONE (ตรงตาม backend)
  async function precheckReadyToQuote(requestId) {
    try {
      const { data } = await apiGet(`/requests/${requestId}`); // admin detail
      const req = data?.data;
      if (!req) return { ok: false, reason: "ไม่พบคำขอ" };

      // หา visit ล่าสุด (ตาม controller รายละเอียดส่งเรียงเวลาอยู่แล้ว แต่กันพลาด)
      const visits = Array.isArray(req.siteVisits) ? req.siteVisits : [];
      if (!visits.length) {
        return { ok: false, reason: "ยังไม่มีนัดหมายดูหน้างาน" };
      }
      const latest = [...visits].sort(
        (a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)
      )[0];

      if (latest.customerResponse !== "APPROVED") {
        return { ok: false, reason: "ลูกค้ายังไม่ยืนยันนัดหมาย (ต้อง APPROVED)" };
      }
      if (latest.status !== "DONE") {
        return { ok: false, reason: "ยังไม่ได้ทำการดูหน้างานให้เสร็จ (ต้อง DONE)" };
      }
      return { ok: true, latest };
    } catch (e) {
      return {
        ok: false,
        reason: e?.response?.data?.message || "ตรวจสอบเงื่อนไขไม่สำเร็จ",
      };
    }
  }

  async function openUpload(reqRow, { isEdit = false } = {}) {
    setTargetReq(reqRow);
    setFile(null);
    setPrice("");
    setValidUntil("");
    setModalMode(isEdit ? "edit" : "create");

    // ทำ pre-check เมื่อเป็นการ "ส่ง" ใหม่ (ตอนแก้ไขปล่อยผ่าน)
    if (!isEdit) {
      const check = await precheckReadyToQuote(reqRow.id);
      if (!check.ok) {
        toast.error(check.reason);
        return;
      }
    }
    setModalOpen(true);
  }

  async function submitUpload() {
    if (!targetReq) return;
    if (!file) return toast.error("กรุณาเลือกไฟล์ PDF ใบเสนอราคา");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (price.trim()) fd.append("totalPrice", price.trim());
      if (validUntil) fd.append("validUntil", validUntil);
      await apiPost(`/quotations/${targetReq.id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(
        modalMode === "edit" ? "แก้ไขใบเสนอราคาสำเร็จ" : "ส่งใบเสนอราคาสำเร็จ"
      );
      setModalOpen(false);
      fetchData(meta.page);
    } catch (e) {
      // สะท้อนข้อความ guard จาก backend ให้แอดมินเห็น
      toast.error(e?.response?.data?.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  // ----- ตาราง -----
  const columns = [
    {
      key: "publicRef",
      header: "เลขอ้างอิง",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{r.publicRef || `#${r.id}`}</span>
          <button
            className="p-1 rounded hover:bg-gray-100"
            title="คัดลอกเลขอ้างอิง"
            onClick={() => {
              navigator.clipboard.writeText(r.publicRef || String(r.id));
              toast.success("คัดลอกแล้ว");
            }}
          >
            <Clipboard size={14} />
          </button>
        </div>
      ),
    },
    { key: "title", header: "หัวข้อ" },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => renderBadge(REQUEST_STATUS, r.status),
    },
    {
      key: "customer",
      header: "ลูกค้า",
      render: (r) =>
        r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : "-",
    },
    {
      key: "createdAt",
      header: "สร้างเมื่อ",
      render: (r) =>
        r.createdAt ? new Date(r.createdAt).toLocaleString("th-TH") : "-",
    },
    {
      key: "actions",
      header: "จัดการ",
      render: (r) => (
        <div className="flex gap-2 justify-end">
          <button
            className="px-3 py-1.5 rounded border hover:bg-gray-50"
            onClick={() => {
              setDetailId(r.id);
              setOpenDetail(true);
            }}
            title={`ดูรายละเอียด ${r.publicRef || `#${r.id}`}`}
          >
            ดูรายละเอียด
          </button>

          <button
            className="px-3 py-1.5 rounded border hover:bg-gray-50 disabled:opacity-50"
            disabled={!canShowQuoteButton(r)}
            onClick={() => openUpload(r, { isEdit: false })}
            title={
              canShowQuoteButton(r)
                ? `ส่งใบเสนอราคาให้ ${r.publicRef || `#${r.id}`}`
                : "ต้องสถานะ 'ดูหน้างานเสร็จ' ก่อน"
            }
          >
            ส่งใบเสนอราคา
          </button>
        </div>
      ),
    },
  ];

  const totalPages = Math.max(
    1,
    Math.ceil((meta.total || 0) / (meta.pageSize || 10))
  );

  return (
    <AdminGuard>
      <Toaster richColors />
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">คำขอล่าสุด</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData(1)}
            placeholder="ค้นหัวข้อ/อีเมล/โทร/ชื่อลูกค้า หรือเลขอ้างอิง (เช่น REQ-202510-00012)"
            className="border rounded px-3 py-2"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">สถานะทั้งหมด</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="createdAt:desc">ใหม่สุดก่อน</option>
            <option value="createdAt:asc">เก่าสุดก่อน</option>
          </select>

          <button
            onClick={() => fetchData(1)}
            className="px-4 py-2 rounded bg-black text-white"
          >
            ค้นหา
          </button>
        </div>

        {loading ? (
          <p>กำลังโหลด...</p>
        ) : (
          <Table columns={columns} data={items} />
        )}

        {/* Pagination */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-gray-600">
            {meta.total} รายการ • หน้า {meta.page} / {totalPages}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={meta.page <= 1}
            onClick={() => fetchData(meta.page - 1)}
          >
            ก่อนหน้า
          </button>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={meta.page >= totalPages}
            onClick={() => fetchData(meta.page + 1)}
          >
            ถัดไป
          </button>
        </div>
      </div>

      {/* Upload Quotation Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${
          modalMode === "edit" ? "แก้ไขใบเสนอราคา" : "ส่งใบเสนอราคา"
        } ให้คำขอ ${targetReq?.publicRef || `#${targetReq?.id ?? "-"}`} (${
          targetReq?.title ?? ""
        })`}
        footer={
          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-2 rounded border"
              onClick={() => setModalOpen(false)}
            >
              ยกเลิก
            </button>
            <button
              className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
              onClick={submitUpload}
              disabled={uploading || !file}
              title="อัปโหลดไฟล์ PDF ใบเสนอราคา"
            >
              {uploading
                ? "กำลังอัปโหลด..."
                : modalMode === "edit"
                ? "บันทึกใบเสนอราคาใหม่"
                : "ส่งใบเสนอราคา"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">ไฟล์ใบเสนอราคา (PDF) *</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">ราคารวม (บาท)</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="เช่น 250000"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">ใช้ได้ถึง (วันที่)</label>
            <input
              type="date"
              className="border rounded px-3 py-2 w-full"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          {targetReq?.status !== "SURVEY_DONE" && (
            <p className="text-xs text-amber-700">
              ต้องเปลี่ยนสถานะนัดหมายเป็น <strong>SURVEY_DONE</strong> ก่อนจึงจะส่งใบเสนอราคาได้
              (ระบบฝั่งเซิร์ฟเวอร์จะตรวจอีกครั้งว่าลูกค้า APPROVED และนัด DONE แล้ว)
            </p>
          )}
        </div>
      </Modal>

      {/* Detail Drawer */}
      <AdminDrawer
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        title={`รายละเอียดคำขอ ${
          items.find((x) => x.id === detailId)?.publicRef || `#${detailId ?? "-"}`
        }`}
        widthClass="w-full max-w-3xl"
      >
        {detailId && (
          <RequestDetail
            requestId={detailId}
            onUploadQuotation={(reqRow, opts) => {
              setOpenDetail(false);
              setTargetReq({
                id: reqRow.id,
                publicRef: reqRow.publicRef,
                title: reqRow.title,
                status: reqRow.status,
              });
              setModalMode(opts?.isEdit ? "edit" : "create");
              openUpload(
                {
                  id: reqRow.id,
                  publicRef: reqRow.publicRef,
                  title: reqRow.title,
                  status: reqRow.status,
                },
                { isEdit: !!opts?.isEdit }
              );
            }}
            onGotoSiteVisits={(rid) => {
              setOpenDetail(false);
              router.push(`/admin/site-visits?requestId=${rid}`);
            }}
          />
        )}
      </AdminDrawer>
    </AdminGuard>
  );
}
