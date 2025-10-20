// frontend/src/app/admin/page.js
"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { REQUEST_STATUS, renderBadge } from "@/lib/statusLabels";

export default function AdminOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ov, setOv] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const role = getRole();
    if (role !== "ADMIN") {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const { data } = await apiGet("/admin/overview");
        setOv(data?.data || null);
      } catch (e) {
        setErr(e?.response?.data?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <div>กำลังโหลด...</div>;
  if (err) return <div className="text-red-600">{err}</div>;
  if (!ov) return <div>ไม่พบข้อมูล</div>;

  const { totals, kpis, breakdown } = ov;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">ภาพรวมระบบ</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-600">จำนวนคำขอทั้งหมด</div>
          <div className="text-2xl font-semibold">
            {totals?.requests ?? "-"}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-600">ส่งใบเสนอราคาแล้ว</div>
          <div className="text-2xl font-semibold">{kpis?.quoted ?? "-"}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-600">
            Conversion (Approved/Quoted)
          </div>
          <div className="text-2xl font-semibold">
            {kpis?.conversion != null ? `${kpis.conversion}%` : "-"}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="font-medium mb-3">สถานะคำขอ</div>
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
          {breakdown?.map((b) => (
            <div key={b.status} className="rounded border p-3">
              <div className="text-xs text-gray-600">
                {renderBadge(REQUEST_STATUS, b.status)}
              </div>
              <div className="text-xl font-semibold">{b.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
