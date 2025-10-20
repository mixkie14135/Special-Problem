// src/lib/urls.js
export const backendBase =
  process.env.NEXT_PUBLIC_BACKEND_PUBLIC ||
  (process.env.NEXT_PUBLIC_API_BASE?.replace(/\/api$/, '') ?? 'http://localhost:8800');

export function fileUrl(p) {
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  if (p.startsWith('/uploads/')) return `${backendBase}${p}`;
  return `${backendBase}/${p.replace(/^\/+/, '')}`;
}
