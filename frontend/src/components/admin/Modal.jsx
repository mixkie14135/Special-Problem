// frontend/src/components/admin/Modal.jsx
"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open = false,
  onClose = () => {},
  title = "",
  children,
  footer,
  widthClass = "max-w-lg", // ปรับความกว้างได้
}) {
  const [mounted, setMounted] = useState(false);

  // รอจน DOM พร้อม (เฉพาะ client)
  useEffect(() => {
    setMounted(true);
  }, []);

  // ปิดด้วย ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ถ้ายังไม่ mount หรือ modal ปิด — ไม่ render อะไรเลย
  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* กล่องโมดัล */}
      <div
        className={`relative w-full ${widthClass} mx-4 rounded-xl bg-white shadow-2xl`}
      >
        {/* Header */}
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

        {/* Body */}
        <div className="p-4">{children}</div>

        {/* Footer (ถ้ามี) */}
        {footer && (
          <div className="px-4 py-3 border-t bg-gray-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
