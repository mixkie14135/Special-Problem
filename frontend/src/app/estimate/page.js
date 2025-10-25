// src/app/estimate/page.js

"use client";

import { useEffect, useMemo, useState } from "react";
import { loadCatalog, calcConcrete, calcTiling, fmtTHB } from "@/lib/estimate";

const TabBtn = ({ active, onClick, children }) => (
  <button
    className={`px-3 py-1.5 rounded border text-sm ${active ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

export default function EstimatePage() {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("concrete"); // concrete | tile
  const [err, setErr] = useState("");

  // แบบฟอร์ม: คอนกรีต
  const [areaC, setAreaC] = useState("");
  const [thicknessC, setThicknessC] = useState("10"); // cm
  const [grade, setGrade] = useState("g240");

  // แบบฟอร์ม: กระเบื้อง
  const [areaT, setAreaT] = useState("");
  const [tileKey, setTileKey] = useState("");

  // ผลลัพธ์
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadCatalog();
        setCatalog(data);
        // default tileKey อันแรก
        const firstTileKey = Object.keys(data.tile || {})[0] || "";
        setTileKey(firstTileKey);
      } catch (e) {
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const monthLabel = useMemo(() => {
    if (!catalog) return "";
    const { source, month } = catalog.meta || {};
    return [source, month].filter(Boolean).join(" • ");
  }, [catalog]);

  const onCalcConcrete = () => {
    try {
      const r = calcConcrete(
        { areaSqm: areaC, thicknessCm: thicknessC, grade },
        catalog
      );
      setResult({
        type: "concrete",
        breakdown: [
          ["ปริมาตร", `${r.volume_m3} ลบ.ม.`],
          ["ค่าวัสดุ", fmtTHB(r.material)],
          ["เศษ/สูญเสีย", fmtTHB(r.loss)],
          ["ค่าแรง", fmtTHB(r.labor)],
          ["รวมประมาณการ", fmtTHB(r.total)],
        ],
        total: r.total,
      });
    } catch (e) {
      setResult(null);
      alert(e.message);
    }
  };

  const onCalcTile = () => {
    try {
      const r = calcTiling({ areaSqm: areaT, tileKey }, catalog);
      setResult({
        type: "tile",
        breakdown: [
          ["กระเบื้อง", fmtTHB(r.tile)],
          ["กาวซีเมนต์", fmtTHB(r.adhesive)],
          ["ยาแนว", fmtTHB(r.grout)],
          ["เศษ/สูญเสีย", fmtTHB(r.loss)],
          ["ค่าแรง", fmtTHB(r.labor)],
          ["รวมประมาณการ", fmtTHB(r.total)],
        ],
        total: r.total,
      });
    } catch (e) {
      setResult(null);
      alert(e.message);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">กำลังโหลดข้อมูล…</div>;
  if (err) return <div className="max-w-4xl mx-auto px-4 py-8 text-red-600">{err}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ประเมินราคาเบื้องต้น</h1>
        {monthLabel && <p className="text-sm text-gray-600 mt-1">อ้างอิงราคา: {monthLabel}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabBtn active={tab === "concrete"} onClick={() => setTab("concrete")}>เทพื้นคอนกรีต</TabBtn>
        <TabBtn active={tab === "tile"} onClick={() => setTab("tile")}>ปูกระเบื้อง</TabBtn>
      </div>

      {/* Forms */}
      {tab === "concrete" && (
        <section className="rounded-lg border p-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block">
              <div className="text-xs text-gray-600 mb-1">พื้นที่ (ตร.ม.)</div>
              <input
                className="border rounded px-3 py-2 w-full"
                value={areaC}
                onChange={(e) => setAreaC(e.target.value)}
                inputMode="decimal"
                placeholder="เช่น 50"
              />
            </label>
            <label className="block">
              <div className="text-xs text-gray-600 mb-1">ความหนา (ซม.)</div>
              <input
                className="border rounded px-3 py-2 w-full"
                value={thicknessC}
                onChange={(e) => setThicknessC(e.target.value)}
                inputMode="decimal"
                placeholder="เช่น 10"
              />
            </label>
            <label className="block">
              <div className="text-xs text-gray-600 mb-1">เกรดคอนกรีต</div>
              <select
                className="border rounded px-3 py-2 w-full"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                {Object.entries(catalog.concrete.grades).map(([k, v]) => (
                  <option key={k} value={k}>
                    {k.toUpperCase()} — {fmtTHB(v)}/ลบ.ม.
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
              onClick={onCalcConcrete}
            >
              คำนวณ
            </button>
          </div>
        </section>
      )}

      {tab === "tile" && (
        <section className="rounded-lg border p-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block md:col-span-1">
              <div className="text-xs text-gray-600 mb-1">พื้นที่ (ตร.ม.)</div>
              <input
                className="border rounded px-3 py-2 w-full"
                value={areaT}
                onChange={(e) => setAreaT(e.target.value)}
                inputMode="decimal"
                placeholder="เช่น 40"
              />
            </label>
            <label className="block md:col-span-2">
              <div className="text-xs text-gray-600 mb-1">ชนิดกระเบื้อง</div>
              <select
                className="border rounded px-3 py-2 w-full"
                value={tileKey}
                onChange={(e) => setTileKey(e.target.value)}
              >
                {Object.entries(catalog.tile).map(([k, v]) => (
                  <option key={k} value={k}>
                    {k.replaceAll("_", " ")} — {fmtTHB(v)}/ตร.ม.
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
              onClick={onCalcTile}
            >
              คำนวณ
            </button>
          </div>
        </section>
      )}

      {/* Result */}
      {result && (
        <section className="rounded-lg border p-4">
          <div className="font-medium mb-2">สรุปประมาณการ</div>
          <div className="divide-y">
            {result.breakdown.map(([label, val]) => (
              <div key={label} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">{label}</span>
                <span className="font-medium">{val}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            * เป็นราคาโดยประมาณจากข้อมูล {monthLabel} (รวมค่าแรงและเผื่อสูญเสีย {catalog.meta.wastage_pct}%)
          </div>
        </section>
      )}
    </div>
  );
}
