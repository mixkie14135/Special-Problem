// src/lib/estimate.js

/** โหลดแคตตาล็อกราคาอย่างง่าย (ฝั่ง FE) */
export async function loadSimpleCatalog() {
  const res = await fetch("/data-materials/catalog.estimate.json", { cache: "no-store" });
  if (!res.ok) throw new Error("โหลดแคตตาล็อกไม่สำเร็จ");
  return res.json();
}

/** คำนวณราคาประเมินแบบง่าย (เฉพาะราคา/ตร.ม. ไม่คิดค่าเดินทาง) */
export function calcSimpleEstimate({ area, type }, catalog) {
  if (!catalog?.types?.[type]) throw new Error("ชนิดงานไม่ถูกต้อง");
  const t = catalog.types[type];

  const A = Number(area) || 0;
  const min = t.min * A;
  const max = t.max * A;
  const avg = ((t.min + t.max) / 2) * A;

  return { min, max, avg, travel: 0, total: avg }; // travel = 0
}

/** ฟอร์แมตราคา (บาท) */
export function moneyTHB(n) {
  try {
    return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(Number(n || 0)) + " บาท";
  } catch {
    return `${n} บาท`;
  }
}
