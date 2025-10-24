"use client";
export default function RequestTimeline({ request }) {
  if (!request) return null;
  const events = [];

  events.push({ label: "สร้างคำขอ", at: request.createdAt });

  if (request.siteVisits?.length) {
    request.siteVisits.forEach(v => {
      events.push({
        label: `นัดดูหน้างาน (${v.status})`,
        at: v.scheduledAt,
        sub: v.customerResponse ? `ลูกค้าตอบ: ${v.customerResponse}` : undefined,
      });
    });
  }

  if (request.quotations?.length) {
    const latest = request.quotations[0];
    events.push({
      label: `ออกใบเสนอราคา (${latest.status})`,
      at: latest.createdAt,
      sub: latest.validUntil ? `ใช้ได้ถึง ${new Date(latest.validUntil).toLocaleDateString("th-TH")}` : undefined,
    });
  }

  if (request.status === "APPROVED" || request.status === "REJECTED") {
    events.push({ label: `คำขอถูก${request.status === "APPROVED" ? "อนุมัติ" : "ปฏิเสธ"}`, at: request.updatedAt || request.createdAt });
  }

  return (
    <div className="space-y-3">
      {events.map((ev, idx) => (
        <div key={idx} className="flex gap-3">
          <div className="w-2 h-2 mt-2 rounded-full bg-gray-400" />
          <div>
            <div className="text-sm font-medium">{ev.label}</div>
            <div className="text-xs text-gray-500">{new Date(ev.at).toLocaleString("th-TH")}</div>
            {ev.sub && <div className="text-xs text-gray-600 mt-0.5">{ev.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
