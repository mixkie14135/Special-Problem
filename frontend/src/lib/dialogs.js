// src/lib/dialogs.js
import Swal from "sweetalert2";

export function confirm({
  title = "ยืนยันดำเนินการ?",
  text = "",
  confirmButtonText = "ยืนยัน",
  cancelButtonText = "ยกเลิก",
} = {}) {
  return Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
  });
}

export function alertSuccess({ title = "สำเร็จ", text = "" } = {}) {
  return Swal.fire({ title, text, icon: "success" });
}

export function alertError({ title = "เกิดข้อผิดพลาด", text = "" } = {}) {
  return Swal.fire({ title, text, icon: "error" });
}
