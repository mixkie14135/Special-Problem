// src/lib/statusLabels.js

// ===== Mapping สถานะทั้งหมด (DB เป็นอังกฤษ → UI ไทย) =====
export const REQUEST_STATUS = {
  NEW:        { label: "คำขอใหม่",           color: "bg-gray-100 text-gray-800",     help: "ลูกค้าส่งคำขอ รอตรวจสอบ/นัดหมาย" },
  SURVEY:     { label: "นัดหมายแล้ว",        color: "bg-sky-100 text-sky-800",       help: "มีนัดดูหน้างาน รอยืนยัน/ดำเนินการ" },
  SURVEY_DONE:{ label: "ดูหน้างานเสร็จ",     color: "bg-blue-100 text-blue-800",     help: "พร้อมทำใบเสนอราคา" },
  QUOTED:     { label: "ส่งใบเสนอราคาแล้ว",   color: "bg-violet-100 text-violet-800", help: "รอลูกค้าตัดสินใจ" },
  APPROVED:   { label: "ลูกค้าตกลง",          color: "bg-green-100 text-green-800",   help: "ลูกค้ายอมรับใบเสนอราคา" },
  REJECTED:   { label: "ลูกค้าปฏิเสธ",        color: "bg-red-100 text-red-800",       help: "ลูกค้าปฏิเสธหรือยกเลิกงาน" },
};

export const VISIT_STATUS = {
  PENDING:   { label: "รอเข้าดูหน้างาน", color: "bg-sky-100 text-sky-800", help: "มีนัดในระบบ" },
  DONE:      { label: "ดูหน้างานแล้ว",  color: "bg-blue-100 text-blue-800", help: "ไปตรวจจริงแล้ว" },
  CANCELLED: { label: "ยกเลิกนัด",      color: "bg-red-100 text-red-800",   help: "ไม่ไปตามนัด" },
};

export const VISIT_RESPONSE = {
  PENDING:  { label: "ยังไม่ตอบ",    color: "bg-gray-100 text-gray-800",  help: "ลูกค้ายังไม่กดยืนยันในระบบ" },
  APPROVED: { label: "ลูกค้ายืนยัน",  color: "bg-green-100 text-green-800", help: "ตกลงเวลานัด" },
  REJECTED: { label: "ลูกค้าปฏิเสธ",  color: "bg-red-100 text-red-800",    help: "ไม่สะดวก/ยกเลิก" },
};

export const QUOTE_STATUS = {
  PENDING:  { label: "รอตัดสินใจ", color: "bg-violet-100 text-violet-800", help: "ลูกค้ากำลังพิจารณา" },
  APPROVED: { label: "ลูกค้าตกลง",  color: "bg-green-100 text-green-800",  help: "เดินหน้าจ้างงาน" },
  REJECTED: { label: "ปฏิเสธ",      color: "bg-red-100 text-red-800",      help: "ไม่รับข้อเสนอ" },
};

// ===== Helpers =====

// รองรับ 2 สไตล์:
// 1) renderBadge(REQUEST_STATUS, "NEW", { className, titleFromHelp })
// 2) renderBadge(REQUEST_STATUS.NEW, { className, titleFromHelp })
export function resolveStatusDef(arg1, arg2) {
  if (!arg1) return null;
  // style-1: (map, key)
  if (arg2 != null && typeof arg2 === "string") {
    const map = arg1;
    const key = arg2;
    return map?.[key] || null;
  }
  // style-2: (def)
  const def = arg1;
  return def || null;
}

export function renderBadge(arg1, arg2, opts = {}) {
  const { className = "", titleFromHelp = true } =
    typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)
      ? arg2
      : opts;

  // ถ้าเป็นสไตล์ 1 → def จาก (map, key)
  // ถ้าเป็นสไตล์ 2 → def จาก (def, opts)
  const def =
    typeof arg2 === "string" ? resolveStatusDef(arg1, arg2) : resolveStatusDef(arg1);

  if (!def) return null;

  const title = titleFromHelp ? (def.help || "") : "";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${def.color} ${className}`}
      title={title}
    >
      {def.label}
    </span>
  );
}
