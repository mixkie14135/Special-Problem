// frontend/src/lib/estimate.js
export async function loadCatalog() {
  const resp = await fetch("/data-materials/catalog.estimate.json", { cache: "no-store" });
  if (!resp.ok) throw new Error("โหลด catalog ไม่สำเร็จ");
  return resp.json();
}

export function fmtTHB(n) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);
}

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** คำนวณเทคอนกรีต */
export function calcConcrete({ areaSqm, thicknessCm, grade }, catalog) {
  const area = Number(areaSqm) || 0;
  const thick = Number(thicknessCm) || 0;
  const unit = catalog?.concrete?.grades?.[grade];
  if (!unit) throw new Error("กรุณาเลือกเกรดคอนกรีต");

  // ปริมาตรคอนกรีต (ลบ.ม.)
  const volume_m3 = area * (thick / 100);

  const material = volume_m3 * unit;
  const loss = material * ((catalog?.meta?.wastage_pct || 0) / 100);
  const labor = area * (catalog?.concrete?.labor_per_sqm || 0);
  const total = material + loss + labor;

  return {
    volume_m3: round2(volume_m3),
    material: round2(material),
    loss: round2(loss),
    labor: round2(labor),
    total: round2(total)
  };
}

/** คำนวณปูกระเบื้อง */
export function calcTiling({ areaSqm, tileKey }, catalog) {
  const area = Number(areaSqm) || 0;
  const tilePrice = catalog?.tile?.[tileKey];
  if (!tilePrice) throw new Error("กรุณาเลือกชนิดกระเบื้อง");

  const tile = area * tilePrice;
  const adhesive = area * (catalog?.allowance?.adhesive_per_sqm || 0);
  const grout = area * (catalog?.allowance?.grout_per_sqm || 0);
  const base = tile + adhesive + grout;

  const loss = base * ((catalog?.meta?.wastage_pct || 0) / 100);
  const labor = area * (catalog?.labor?.tiling_per_sqm || 0);
  const total = base + loss + labor;

  return {
    tile: round2(tile),
    adhesive: round2(adhesive),
    grout: round2(grout),
    loss: round2(loss),
    labor: round2(labor),
    total: round2(total)
  };
}
