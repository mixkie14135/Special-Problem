// frontend/src/lib/guards.js
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from './auth';

// เรียกในเพจลูกค้า/แอดมิน (Client Component)
export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);
}

export function useRequireAdmin(me) {
  // me: ข้อมูลผู้ใช้จาก /auth/me ที่เพจโหลดมา
  const router = useRouter();
  useEffect(() => {
    if (!me) return;
    if (me.role !== 'ADMIN') router.replace('/');
  }, [me, router]);
}
