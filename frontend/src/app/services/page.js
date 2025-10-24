// frontend/src/app/services/page.js
"use client";

import { useEffect, useState, useMemo } from "react";
import { api, toPublicUrl } from "@/lib/api";
import { toast, Toaster } from "sonner";

const BRAND = "#E2AC24";

// Fallback (ใช้ตอนโหลดไม่สำเร็จ/ยังไม่มีข้อมูล) – คงเลย์เอาท์เดิม
const FALLBACK = [
  { title: "รีโนเวท/ต่อเติม", desc: "ปรับปรุงพื้นที่ให้เหมาะกับการใช้งานและงบประมาณ ประเมินตามหน้างาน", icon: "/service_renovate_Icon.svg" },
  { title: "งานหลังคา", desc: "ติดตั้งหรือซ่อมแซม พร้อมแบบและวัสดุที่เหมาะสม", icon: "/service_rooftop_Icon.svg" },
  { title: "ระบบไฟฟ้า", desc: "ตรวจเช็ก ติดตั้ง และแก้ปัญหา โดยคำนึงถึงความปลอดภัยเป็นหลัก", icon: "/service_electric_Icon.svg" },
  { title: "ระบบประปา", desc: "เดินท่อ ติดตั้งอุปกรณ์ และซ่อมจุดรั่วซึมตามอาคาร", icon: "/service_plumbing_Icon.svg" },
  { title: "ทาสี ภายใน/ภายนอก", desc: "เตรียมผิวและทาสีตามมาตรฐาน งานเรียบเนียน", icon: "/service_paint_Icon.svg" },
  { title: "สำรวจหน้างาน/ให้คำปรึกษา", desc: "นัดดูพื้นที่ แนะนำแนวทาง และสรุปรายละเอียดก่อนเริ่มงาน", icon: "/service_sitevisit_Icon.svg" },
];

export default function ServicesPage() {
  const [items, setItems] = useState([]);   // จาก API
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/categories");
        const rows = data?.data || [];
        if (alive) setItems(rows);
      } catch (e) {
        // แสดง fallback เงียบ ๆ ให้หน้าไม่โล่ง
        toast.info("กำลังแสดงข้อมูลตัวอย่าง");
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // เตรียมข้อมูลที่จะแสดง (ใช้ 6 รายการแรกให้คงเลย์เอาท์ของหน้า)
  const cards = useMemo(() => {
    if (items?.length) {
      return items.slice(0, 6).map((c) => ({
        key: c.id,
        title: c.name,
        desc: c.description || "",
        // iconUrl จาก backend เป็น path relative (/uploads/..)
        icon: c.iconUrl ? toPublicUrl(c.iconUrl) : "/service_generic_Icon.svg",
      }));
    }
    // fallback
    return FALLBACK.map((f, i) => ({ key: `fb-${i}`, ...f }));
  }, [items]);

  // มีมากกว่า 6 ไหม (ถ้าจะทำหน้า “ดูทั้งหมด” ในอนาคต)
  const hasMore = items.length > 6;

  return (
    <main className="px-4 md:px-10 xl:px-[190px]">
      <Toaster richColors />
      {/* Heading */}
      <section className="text-center pt-10 md:pt-14">
        <h1
          className="text-3xl md:text-4xl font-bold tracking-wide"
          style={{ color: BRAND }}
        >
          บริการของเรา
        </h1>
        <p className="mt-4 text-gray-700 max-w-3xl mx-auto leading-relaxed">
          เรารับงานก่อสร้างและซ่อมแซมหลากหลาย ตั้งแต่งานเล็กไปจนถึงรีโนเวททั้งหลัง
          <br className="hidden md:block" />
          โดยทีมช่างมืออาชีพ เน้นคุณภาพ ความปลอดภัย และตรงเวลา
        </p>
      </section>

      {/* Grid */}
      <section className="mt-10 md:mt-14 grid gap-10 md:gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-${i}`} className="text-center animate-pulse">
                <div
                  className="mx-auto w-16 h-16 rounded-2xl border"
                  style={{
                    borderColor: `${BRAND}33`,
                    backgroundColor: `${BRAND}14`,
                  }}
                />
                <div className="mt-4 h-4 w-40 mx-auto bg-gray-200 rounded" />
                <div className="mt-2 h-3 w-56 mx-auto bg-gray-200 rounded" />
              </div>
            ))
          : cards.map((s, i) => (
              <div key={s.key ?? i} className="text-center">
                <div
                  className="mx-auto w-16 h-16 rounded-2xl border flex items-center justify-center"
                  style={{
                    borderColor: `${BRAND}33`,     // 20% opacity
                    backgroundColor: `${BRAND}14`, // ~8% opacity
                  }}
                >
                  {/* ใช้ <img> เพื่อหลีกเลี่ยง domain config ของ next/image เมื่อดึงจากพอร์ต 8800 */}
                  <img
                    src={s.icon}
                    alt={s.title}
                    className="object-contain h-7 w-7"
                    loading={i < 3 ? "eager" : "lazy"}
                  />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
      </section>

      {/* CTA */}
      <div className="text-center my-12 md:my-14">
        {hasMore ? (
          // ถ้าในอนาคตมีหน้ารวม/เพจย่อย ค่อยเปลี่ยนลิงก์ปลายทาง
          <a
            href="/portfolio"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-white hover:opacity-95"
            style={{ backgroundColor: BRAND }}
          >
            ดูเพิ่มเติม
          </a>
        ) : (
          <button
            onClick={() => toast.info("ยังไม่มีบริการเพิ่มเติม")}
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-white hover:opacity-95"
            style={{ backgroundColor: BRAND }}
          >
            ดูเพิ่มเติม
          </button>
        )}
      </div>
    </main>
  );
}
