// src/lib/auth.js
const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const USER_KEY = "user";
const SESSION_EVENT = "session:change";

const canUseDOM = () => typeof window !== "undefined";

/** ----- getters ----- */
export const getToken = () =>
  canUseDOM() ? localStorage.getItem(TOKEN_KEY) : null;

export const getRole = () =>
  canUseDOM() ? localStorage.getItem(ROLE_KEY) : null;

export const getUser = () => {
  if (!canUseDOM()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** ----- low-level setters (ยิง event ทุกครั้ง) ----- */
function emitSessionChange(payload) {
  if (!canUseDOM()) return;
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: payload }));
}

export const setToken = (t) => {
  if (!canUseDOM()) return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
  emitSessionChange({ type: "token", value: !!t });
};

export const setRole = (role) => {
  if (!canUseDOM()) return;
  if (role) localStorage.setItem(ROLE_KEY, role);
  else localStorage.removeItem(ROLE_KEY);
  emitSessionChange({ type: "role", value: role || null });
};

export const setUser = (u) => {
  if (!canUseDOM()) return;
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
  emitSessionChange({ type: "user", value: u || null });
};

/** ----- high-level session api ----- */
export const setSession = (token, role, user) => {
  setToken(token || null);
  setRole(role || null);
  setUser(user || null);
  emitSessionChange({ type: "session", value: { token: !!token, role, user } });
};

export const clearSession = () => {
  setToken(null);
  setRole(null);
  setUser(null);
  emitSessionChange({ type: "session", value: { token: false, role: null, user: null } });
};

/** ----- optional: hook สำหรับ sync ข้ามแท็บ/คอมโพเนนต์ ----- */
// ใช้ใน client component: const session = useSession();
// session = { token, role, user }
export function useSession() {
  // ใช้แบบเบา ๆ เพื่อหลีกเลี่ยงการลาก useState เข้ามาในไฟล์นี้
  // ให้คอมโพเนนต์สร้าง state เองแล้วสมัครฟังอีเวนต์นี้
  return { getToken, getRole, getUser, SESSION_EVENT };
}
