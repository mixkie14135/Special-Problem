// frontend/src/components/admin/Table.jsx
"use client";

export default function Table({ columns = [], data = [] }) {
  // helper: สร้าง key ปลอดภัยต่อ header/cell
  const colKey = (c, idx) => c.key || c.id || c.header || `col-${idx}`;

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((c, idx) => (
              <th
                key={colKey(c, idx)}
                className={`px-3 py-2 text-left font-medium text-gray-700 ${c.headerClassName || ""}`}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header ?? c.key ?? ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500">
                ไม่มีข้อมูล
              </td>
            </tr>
          ) : (
            data.map((row, rIdx) => (
              <tr key={row.id ?? rIdx} className="border-t">
                {columns.map((c, cIdx) => {
                  const k = colKey(c, cIdx);
                  const content =
                    typeof c.render === "function"
                      ? c.render(row, rIdx)
                      : (row[c.key] ?? "-");

                  return (
                    <td
                      key={`${k}-${row.id ?? rIdx}`}
                      className={`px-3 py-2 ${c.cellClassName || ""}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
