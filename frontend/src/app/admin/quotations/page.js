// frontend/src/app/admin/quotations/page.js
"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import AdminGuard from "@/components/admin/AdminGuard";
import Table from "@/components/admin/Table";
import { Toaster } from "sonner";
import { fileUrl } from "@/lib/urls";
import { QUOTE_STATUS, renderBadge } from "@/lib/statusLabels";

export default function AdminQuotationsPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await apiGet("/admin/quotations/pending", {
        page,
        pageSize: 10,
        q,
      });
      setItems(data.data || []);
      setMeta(data.meta || { page, pageSize: 10, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { key: "id", header: "ID" },
    { key: "request", header: "คำขอ", render: (r) => r.request?.title || "-" },
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
        r.validUntil ? new Date(r.validUntil).toLocaleDateString("th-TH") : "-",
    },
    {
      key: "file",
      header: "ไฟล์",
      render: (r) =>
        r.fileUrl ? (
          <a
            href={fileUrl(r.fileUrl)}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            ดูไฟล์
          </a>
        ) : (
          "-"
        ),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => renderBadge(QUOTE_STATUS, r.status),
    },
    {
      key: "createdAt",
      header: "สร้างเมื่อ",
      render: (r) => new Date(r.createdAt).toLocaleString("th-TH"),
    },
  ];

  return (
    <AdminGuard>
      <Toaster richColors />
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">ใบเสนอราคาที่รอตอบ</h1>

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นชื่อคำขอ/ชื่อลูกค้า/อีเมล"
            className="border rounded px-3 py-2"
          />
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

        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-gray-600">
            {meta.total} รายการ • หน้า {meta.page} /{" "}
            {Math.max(1, Math.ceil((meta.total || 0) / (meta.pageSize || 10)))}
          </span>
        </div>
      </div>
    </AdminGuard>
  );
}
