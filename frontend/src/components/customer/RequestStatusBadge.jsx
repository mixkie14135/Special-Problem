"use client";
const STYLES = {
  NEW: "bg-gray-100 text-gray-800",
  SURVEY: "bg-amber-100 text-amber-800",
  SURVEY_DONE: "bg-emerald-100 text-emerald-800",
  QUOTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};
export default function RequestStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded ${STYLES[status] || "bg-gray-100"}`}>
      {status || "-"}
    </span>
  );
}