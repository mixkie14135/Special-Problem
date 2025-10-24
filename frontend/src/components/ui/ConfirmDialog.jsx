"use client";
export default function ConfirmDialog({
  open, title="ยืนยันการทำรายการ", message, confirmText="ยืนยัน", cancelText="ยกเลิก",
  onConfirm, onClose,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-white shadow-lg p-4">
        <h3 className="font-semibold">{title}</h3>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded border" onClick={onClose}>{cancelText}</button>
          <button className="px-3 py-1.5 rounded bg-black text-white" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
