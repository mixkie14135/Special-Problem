// frontend/src/components/admin/AdminDrawer.jsx
"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function AdminDrawer({
  open,
  onClose = () => {},
  title = "",
  children,
  widthClass = "w-full max-w-2xl",
}) {
  // ปิดด้วย ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* panel */}
      <div className="absolute right-0 top-0 h-full bg-white shadow-2xl flex flex-col">
        <div className={`${widthClass} h-full flex flex-col`}>
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="p-4 overflow-auto">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
