// src/lib/api.js
"use client";

import axios from "axios";
import { getToken, clearSession } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8800/api";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // ถ้าจะใช้คุกกี้/เซสชันฝั่ง server ค่อยเปลี่ยนเป็น true
  headers: {
    Accept: "application/json",
    // อย่าตั้ง Content-Type ตายตัวที่นี่ เพื่อให้ axios เซ็ตให้อัตโนมัติเมื่อเป็น FormData
  },
});

// แนบ JWT ทุกครั้ง (เฉพาะฝั่ง client)
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? getToken() : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// เคส token หมดอายุ → ล้าง session (ให้เพจตัดสินใจ redirect เอง)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      clearSession();
    }
    return Promise.reject(err);
  }
);

/* ---------- Helper functions (เรียกสั้น ๆ) ---------- */
// เพิ่มพารามิเตอร์ config (ออปชัน) เพื่อให้ส่ง signal/validateStatus ฯลฯ ได้
export const apiGet = (url, params, config) => api.get(url, { params, ...(config || {}) });
export const apiPost = (url, data, config) => api.post(url, data, config);
export const apiPut = (url, data, config) => api.put(url, data, config);
export const apiPatch = (url, data, config) => api.patch(url, data, config);
export const apiDelete = (url, config) => api.delete(url, config);

// อัปโหลดไฟล์ (ปล่อยให้ axios ตั้ง multipart boundary ให้เอง)
export function apiUpload(url, formData, extraHeaders = {}) {
  return api.post(url, formData, { headers: { ...extraHeaders } });
}

/**
 * แปลง path แบบสัมพัทธ์จาก backend → URL แบบเต็ม (กรณี backend คืน /uploads/xxx)
 * ถ้าเป็น URL เต็มอยู่แล้วจะคืนค่าเดิม
 */
export function toPublicUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  // BASE_URL มักลงท้ายด้วย /api → ตัด /api ออกเพื่อให้เหลือ origin เดิม
  const origin = BASE_URL.replace(/\/api\/?$/, "");
  return `${origin}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}
