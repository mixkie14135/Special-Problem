// frontend/src/app/admin/page.js  // หน้า ภาพรวมแอดมิน
"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { REQUEST_STATUS, renderBadge } from "@/lib/statusLabels";

/** แปลง response ให้ได้ shape เดียวกันเสมอ */
function normalizeOverview(raw) {
  if (!raw || typeof raw !== "object") return { totals: {}, kpis: {}, breakdown: [] };

  const totalsRaw = raw.totals || raw.counts || {};
  const kpisRaw   = raw.kpis   || raw.metrics || {};

  const totals = {
    requests:
      totalsRaw.requests ??
      totalsRaw.totalRequests ??
      raw.requests ?? 0,
  };

  const quoted_all =
    kpisRaw.quoted_all ??
    kpisRaw.quotes_all ??
    kpisRaw.quoted ??
    kpisRaw.quotes ??
    kpisRaw.quotationSent ??
    raw.quoted ?? 0;

  const quoted_pending =
    kpisRaw.quoted_pending ??
    kpisRaw.quotes_pending ??
    kpisRaw.quoted ?? 0;

  const approved =
    kpisRaw.approved ??
    kpisRaw.approvals ??
    raw.approved ?? 0;

  const rejected =
    kpisRaw.rejected ??
    kpisRaw.rejects ??
    raw.rejected ?? 0;

  let conversion =
    kpisRaw.conversion ??
    kpisRaw.approvalRate ??
    kpisRaw.approved_ratio ?? null;

  let decisionRate =
    kpisRaw.decisionRate ??
    kpisRaw.decision_rate ?? null;

  if (conversion == null)   conversion   = quoted_all > 0 ? Math.round((approved / quoted_all) * 100) : 0;
  if (decisionRate == null) decisionRate = quoted_all > 0 ? Math.round(((approved + rejected) / quoted_all) * 100) : 0;

  const breakdown = raw.breakdown || raw.statusBreakdown || [];

  return {
    totals,
    kpis: { quoted_all, quoted_pending, approved, rejected, conversion, decisionRate },
    breakdown,
  };
}

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
        const raw = data?.data ?? data ?? null;
        const normalized = normalizeOverview(raw);
        setOv(normalized);
        if (process.env.NODE_ENV !== "production") {
          console.log("[/admin/overview raw]", raw);
          console.log("[normalized]", normalized);
        }
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

  const { totals = {}, kpis = {}, breakdown = [] } = ov;

  const fmtNum = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);
  const fmtPct = (v) => (typeof v === "number" && !Number.isNaN(v) ? `${v}%` : "0%");

  // ----- แบบ B: แสดงเฉพาะสถานะต้น–กลางน้ำ (ไม่รวม APPROVED/REJECTED) -----
  const WORKFLOW_STATUSES = ["NEW", "SURVEY", "SURVEY_DONE", "QUOTED"];
  const countMap = Object.fromEntries(breakdown.map(b => [b.status, b.count]));
  const displayBreakdown = WORKFLOW_STATUSES.map(st => ({
    status: st,
    count: countMap[st] ?? 0,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">ภาพรวมระบบ</h1>

      {/* ส่วนที่ 1: KPI ภาพรวมใบเสนอราคา */}
      <div>
        <h2 className="text-lg font-medium mb-1">สรุปใบเสนอราคา (ทั้งหมด)</h2>
        <p className="text-sm text-gray-500 mb-3">
          รวมข้อมูลใบเสนอราคาที่เคยส่งทั้งหมด และสัดส่วนการตอบรับของลูกค้า
        </p>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-600">จำนวนคำขอทั้งหมด</div>
            <div className="text-2xl font-semibold">{fmtNum(totals.requests)}</div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-600">ใบเสนอราคาทั้งหมด</div>
            <div className="text-2xl font-semibold">{fmtNum(kpis.quoted_all)}</div>
            <div className="text-xs text-gray-500 mt-1">รวม QUOTED / APPROVED / REJECTED</div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-600">รอลูกค้าตัดสินใจ</div>
            <div className="text-2xl font-semibold">{fmtNum(kpis.quoted_pending)}</div>
            <div className="text-xs text-gray-500 mt-1">สถานะ QUOTED</div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-600">อัตรายืนยัน (Approved / All Quotes)</div>
            <div className="text-2xl font-semibold">{fmtPct(kpis.conversion)}</div>
          </div>
        </div>

        {/* KPIs ชุดเสริม */}
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-600">ลูกค้าตกลงใบเสนอราคา (Approved)</div>
            <div className="text-2xl font-semibold">{fmtNum(kpis.approved)}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-600">ปฏิเสธ (Rejected)</div>
            <div className="text-2xl font-semibold">{fmtNum(kpis.rejected)}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-600">Decision Rate (Approved+Rejected)</div>
            <div className="text-2xl font-semibold">{fmtPct(kpis.decisionRate)}</div>
          </div>
        </div>
      </div>

      {/* ส่วนที่ 2: สถานะคำขอปัจจุบัน (เฉพาะงานที่ยังเดินอยู่) */}
      <div>
        <h2 className="text-lg font-medium mb-1">สถานะคำขอ (ปัจจุบัน)</h2>
        <p className="text-sm text-gray-500 mb-3">
          แสดงจำนวนคำขอในขั้นตอนที่ยังดำเนินการอยู่ (NEW → SURVEY → SURVEY_DONE → QUOTED)
        </p>

        <div className="rounded-lg border p-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {displayBreakdown.map((b) => (
              <div key={b.status} className="rounded border p-3">
                <div className="text-xs text-gray-600">
                  {renderBadge(REQUEST_STATUS, b.status)}
                </div>
                <div className="text-xl font-semibold">{fmtNum(b.count)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
