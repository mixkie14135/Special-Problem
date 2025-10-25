"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import AdminGuard from "@/components/admin/AdminGuard";
import Table from "@/components/admin/Table";
import AdminDrawer from "@/components/admin/AdminDrawer";
import RequestDetail from "@/components/admin/RequestDetail";
import { Toaster, toast } from "sonner";
import { fileUrl } from "@/lib/urls";
import { QUOTE_STATUS, renderBadge } from "@/lib/statusLabels";
import { confirm } from "@/lib/dialogs"; // ✅ SweetAlert helper

function toISODate(d) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminQuotationsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const requestIdParam = params?.get("requestId") || "";

  // ===== metrics =====
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    conversion: null,
  });

  // ====== Context (เมื่อมี requestId ใน URL) ======
  const [targetReq, setTargetReq] = useState(null);
  const [latestQuote, setLatestQuote] = useState(null);
  const [uplFile, setUplFile] = useState(null);
  const [uplPrice, setUplPrice] = useState("");
  const [uplValidUntil, setUplValidUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [contextCollapsed, setContextCollapsed] = useState(false);

  // ====== Filters / tabs ======
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | PENDING | APPROVED | REJECTED
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  // ====== Table list ======
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);

  // ====== Drawer: Request detail ======
  const [openDetail, setOpenDetail] = useState(false);
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    if (activeTab === "ALL") setStatus("");
    else setStatus(activeTab);
  }, [activeTab]);

  const fetchList = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await apiGet("/admin/quotations/pending", {
        page,
        pageSize: meta.pageSize || 10,
        q: q.trim(), // trim ก่อนยิง
      });
      const rows = data?.data || [];
      setItems(rows);
      setMeta(data?.meta || { page, pageSize: 10, total: rows.length });

      // อัปเดต metric จากผลชุดที่โหลดมา
      const pending = rows.filter((x) => x.status === "PENDING").length;
      const approved = rows.filter((x) => x.status === "APPROVED").length;
      const rejected = rows.filter((x) => x.status === "REJECTED").length;
      const total = rows.length;
      const conversion =
        pending + approved > 0
          ? Math.round((approved / (pending + approved)) * 100)
          : null;
      setMetrics({ total, pending, approved, rejected, conversion });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== target request load ======
  useEffect(() => {
    const rid = Number(requestIdParam);
    if (!rid) {
      setTargetReq(null);
      setLatestQuote(null);
      return;
    }
    (async () => {
      setLoadingTarget(true);
      try {
        const { data: r1 } = await apiGet(`/requests/${rid}`);
        setTargetReq(r1?.data || null);

        try {
          const { data: r2 } = await apiGet(`/quotations/${rid}`, {
            latest: true,
          });
          setLatestQuote(r2?.data || null);
          setUplPrice(
            r2?.data?.totalPrice != null ? String(r2.data.totalPrice) : ""
          );
          setUplValidUntil(
            r2?.data?.validUntil ? toISODate(new Date(r2.data.validUntil)) : ""
          );
        } catch {
          setLatestQuote(null);
          setUplPrice("");
          setUplValidUntil("");
        }
      } finally {
        setLoadingTarget(false);
      }
    })();
  }, [requestIdParam]);

  const canCreate = useMemo(
    () => !!targetReq && targetReq.status === "SURVEY_DONE" && !latestQuote,
    [targetReq, latestQuote]
  );
  const canEdit = useMemo(
    () => !!latestQuote && latestQuote.status === "PENDING",
    [latestQuote]
  );

  const onSubmitUpload = async () => {
    const rid = Number(requestIdParam);
    if (!rid) return;

    if (!uplFile && !canEdit) {
      toast.error("กรุณาเลือกไฟล์ใบเสนอราคา (PDF)");
      return;
    }

    // ✅ SweetAlert ยืนยันก่อนทำจริง
    const { isConfirmed } = await confirm({
      title: canCreate ? "ส่งใบเสนอราคา?" : "อัปเดตใบเสนอราคา?",
      text: canCreate
        ? "ระบบจะส่งไฟล์ใบเสนอราคาใหม่ให้ลูกค้า"
        : "ระบบจะอัปเดตไฟล์/ข้อมูลของใบเสนอราคาล่าสุด",
      confirmButtonText: canCreate ? "ส่งใบเสนอราคา" : "อัปเดต",
      cancelButtonText: "ยกเลิก",
    });
    if (!isConfirmed) return;

    setSaving(true);
    try {
      const fd = new FormData();
      if (uplFile) fd.append("file", uplFile);
      if (uplPrice !== "") fd.append("totalPrice", uplPrice);
      if (uplValidUntil)
        fd.append("validUntil", new Date(uplValidUntil).toISOString());

      if (canCreate) {
        await apiPost(`/quotations/${rid}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("อัปโหลดใบเสนอราคาแล้ว");
      } else if (canEdit && latestQuote) {
        await apiPatch(`/quotations/${latestQuote.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("อัปเดตใบเสนอราคาแล้ว");
      } else {
        toast.error("สถานะปัจจุบันไม่อนุญาตให้อัปโหลด/แก้ไข");
        return;
      }

      // reload context
      const { data: r1 } = await apiGet(`/requests/${rid}`);
      setTargetReq(r1?.data || null);
      try {
        const { data: r2 } = await apiGet(`/quotations/${rid}`, {
          latest: true,
        });
        setLatestQuote(r2?.data || null);
      } catch {
        setLatestQuote(null);
      }
      setUplFile(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  // เหลือกรองแค่สถานะ (แท็บ) ฝั่ง FE — การค้นหาใช้ฝั่ง BE อยู่แล้ว
  const filteredRows = useMemo(() => {
    let rows = items;
    if (status) rows = rows.filter((r) => r.status === status);
    return rows;
  }, [items, status]);

  const onClearFilters = () => {
    setActiveTab("ALL");
    setStatus("");
    setQ("");
    fetchList(1);
  };

  const SummaryCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="rounded-lg border p-3">
        <div className="text-xs text-gray-500">ทั้งหมด</div>
        <div className="text-2xl font-semibold">{metrics.total}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-xs text-gray-500">รอตอบ (Pending)</div>
        <div className="text-2xl font-semibold">{metrics.pending}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-xs text-gray-500">ลูกค้าตกลง</div>
        <div className="text-2xl font-semibold">{metrics.approved}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-xs text-gray-500">ปฏิเสธ</div>
        <div className="text-2xl font-semibold">{metrics.rejected}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-xs text-gray-500">Conversion</div>
        <div className="text-2xl font-semibold">
          {metrics.conversion != null ? `${metrics.conversion}%` : "-"}
        </div>
      </div>
    </div>
  );

  const ContextPanel = () => {
    if (!requestIdParam) return null;

    if (loadingTarget) {
      return (
        <div className="rounded-lg border p-3">
          กำลังโหลดคำขอ #{requestIdParam} …
        </div>
      );
    }
    if (!targetReq) {
      return (
        <div className="rounded-lg border p-3 text-red-600">
          ไม่พบคำขอ #{requestIdParam}
        </div>
      );
    }

    const cannotUpload = !(canCreate || canEdit);
    return (
      <div className="rounded-lg border">
        <div className="flex items-center justify-between p-3">
          <div className="font-medium">
            ใบเสนอราคาสำหรับคำขอ #{targetReq.id}: {targetReq.title}
          </div>
          <button
            className="text-sm underline"
            onClick={() => setContextCollapsed((s) => !s)}
          >
            {contextCollapsed ? "แสดงรายละเอียด" : "ย่อ"}
          </button>
        </div>

        {!contextCollapsed && (
          <div className="border-t p-3 space-y-3">
            {cannotUpload ? (
              <div className="text-sm">
                {latestQuote ? (
                  <>
                    สถานะใบล่าสุด:{" "}
                    {renderBadge(QUOTE_STATUS, latestQuote.status)}{" "}
                    {latestQuote.fileUrl && (
                      <>
                        •{" "}
                        <a
                          className="underline"
                          href={fileUrl(latestQuote.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ดูไฟล์
                        </a>
                      </>
                    )}
                  </>
                ) : (
                  <>ยังไม่มีใบเสนอราคา (คำขอต้องอยู่สถานะ SURVEY_DONE จึงจะส่งครั้งแรกได้)</>
                )}
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-3">
                  <label className="block md:col-span-3">
                    <div className="text-sm text-gray-600 mb-1">ไฟล์ PDF</div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setUplFile(e.target.files?.[0] || null)}
                    />
                    {canEdit && latestQuote?.fileUrl && (
                      <div className="text-xs text-gray-500 mt-1">
                        ไฟล์ปัจจุบัน:{" "}
                        <a
                          className="underline"
                          href={fileUrl(latestQuote.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          เปิดดู
                        </a>{" "}
                        • อัปโหลดไฟล์ใหม่เพื่อทับ
                      </div>
                    )}
                  </label>

                  <label className="block">
                    <div className="text-sm text-gray-600 mb-1">ยอดรวม (บาท)</div>
                    <input
                      className="border rounded px-3 py-2 w-full"
                      value={uplPrice}
                      onChange={(e) => setUplPrice(e.target.value)}
                      placeholder="เช่น 150000"
                      inputMode="decimal"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm text-gray-600 mb-1">ใช้ได้ถึง</div>
                    <input
                      type="date"
                      className="border rounded px-3 py-2 w-full"
                      value={uplValidUntil}
                      onChange={(e) => setUplValidUntil(e.target.value)}
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
                    disabled={saving}
                    onClick={onSubmitUpload}
                  >
                    {saving
                      ? "กำลังบันทึก..."
                      : canCreate
                      ? "ส่งใบเสนอราคา"
                      : "อัปเดตใบเสนอราคา"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const FilterBar = () => (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "ALL", label: "ทั้งหมด" },
          { key: "PENDING", label: "รอตอบ" },
          { key: "APPROVED", label: "ตกลง" },
          { key: "REJECTED", label: "ปฏิเสธ" },
        ].map((t) => (
          <button
            key={t.key}
            className={`px-3 py-1.5 rounded border ${
              activeTab === t.key ? "bg-gray-900 text-white" : "hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-2">
        <label className="block md:col-span-2">
          <div className="text-xs text-gray-600 mb-1">
            ค้นหา (ชื่อคำขอ/ชื่อลูกค้า/อีเมล)
          </div>
          <input
            className="border rounded px-3 py-2 w-full"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchList(1)}
            placeholder="พิมพ์คำค้น… แล้วกด Enter หรือปุ่มค้นหา"
          />
        </label>
      </div>

      <div className="flex justify-between">
        <button className="px-3 py-2 rounded border" onClick={onClearFilters}>
          ล้างตัวกรอง
        </button>
        <button
          className="px-3 py-2 rounded bg-black text-white"
          onClick={() => fetchList(1)}
        >
          ค้นหา
        </button>
      </div>
    </div>
  );

  const columns = [
    { key: "id", header: "ID", width: 64 },
    {
      key: "request",
      header: "คำขอ",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.request?.title || "-"}</span>
          <span className="text-xs text-gray-500">#{r.request?.id}</span>
        </div>
      ),
    },
    {
      key: "customer",
      header: "ลูกค้า",
      render: (r) =>
        r.request?.customer
          ? `${r.request.customer.firstName} ${r.request.customer.lastName}`
          : "-",
    },
    {
      key: "totalPrice",
      header: "ราคา",
      render: (r) =>
        r.totalPrice != null
          ? new Intl.NumberFormat("th-TH").format(r.totalPrice) + " บาท"
          : "-",
    },
    {
      key: "validUntil",
      header: "ใช้ได้ถึง",
      render: (r) =>
        (() => {
          if (!r.validUntil) return "—";
          const d = new Date(r.validUntil);
          const now = new Date();
          const daysLeft = Math.ceil((d - now) / 86400000);
          const dateText = d.toLocaleDateString("th-TH");
          if (d < now)
            return (
              <span className="text-red-600">{dateText} • หมดอายุแล้ว</span>
            );
          if (daysLeft <= 7)
            return (
              <span className="text-amber-700">
                {dateText} • เหลือ {daysLeft} วัน
              </span>
            );
          return dateText;
        })(),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => renderBadge(QUOTE_STATUS, r.status),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-2">
          {r.fileUrl && (
            <a
              href={fileUrl(r.fileUrl)}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-1 rounded border hover:bg-gray-50"
              title="เปิดไฟล์"
            >
              เปิดไฟล์
            </a>
          )}
          <button
            className="px-2 py-1 rounded border hover:bg-gray-50"
            title="ไปยังคำขอ (ดูรายละเอียด)"
            onClick={() => {
              setDetailId(r.request?.id || null);
              setOpenDetail(true);
            }}
          >
            ไปคำขอ
          </button>
          <button
            className="px-2 py-1 rounded border hover:bg-gray-50"
            title="ไปนัดหมายของคำขอนี้"
            onClick={() =>
              router.push(`/admin/site-visits?requestId=${r.request?.id || ""}`)
            }
          >
            นัดหมาย
          </button>
        </div>
      ),
    },
  ];

  const totalPages = Math.max(
    1,
    Math.ceil((filteredRows.length || 0) / (meta.pageSize || 10))
  );

  return (
    <AdminGuard>
      <Toaster richColors />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">ใบเสนอราคา</h1>
          {requestIdParam && (
            <button
              className="text-sm underline"
              onClick={() => router.push("/admin/quotations")}
              title="กลับไปโหมดดูทั้งหมด"
            >
              ดูทั้งหมด
            </button>
          )}
        </div>

        <SummaryCards />
        <ContextPanel />
        <FilterBar />

        {loading ? (
          <p>กำลังโหลด...</p>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-lg border p-6 text-center text-gray-500">
            ไม่พบข้อมูลที่ตรงเงื่อนไข
            <div className="mt-2">
              <button
                className="px-3 py-2 rounded border"
                onClick={onClearFilters}
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        ) : (
          <Table columns={columns} data={filteredRows} />
        )}

        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-gray-600">
            {filteredRows.length} รายการ • หน้า {meta.page} / {totalPages}
          </span>
        </div>
      </div>

      {/* Drawer: เปิดรายละเอียดคำขอตามที่ต้องการ */}
      <AdminDrawer
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        title={`รายละเอียดคำขอ #${detailId ?? "-"}`}
        widthClass="w-full max-w-3xl"
      >
        {openDetail && detailId && (
          <RequestDetail
            requestId={detailId}
            onUploadQuotation={(reqRow) => {
              setOpenDetail(false);
              router.push(`/admin/quotations?requestId=${reqRow.id}`);
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
