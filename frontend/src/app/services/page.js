// src/app/services/page.js
import Image from "next/image";
import Link from "next/link";

const BRAND = "#E2AC24";

const SERVICES = [
  {
    title: "รีโนเวท/ต่อเติม",
    desc: "ปรับปรุงพื้นที่ให้เหมาะกับการใช้งานและงบประมาณ ประเมินตามหน้างาน",
    icon: "/service_renovate_Icon.svg",
  },
  {
    title: "งานหลังคา",
    desc: "ติดตั้งหรือซ่อมแซม พร้อมแบบและวัสดุที่เหมาะสม",
    icon: "/service_rooftop_Icon.svg",
  },
  {
    title: "ระบบไฟฟ้า",
    desc: "ตรวจเช็ก ติดตั้ง และแก้ปัญหา โดยคำนึงถึงความปลอดภัยเป็นหลัก",
    icon: "/service_electric_Icon.svg",
  },
  {
    title: "ระบบประปา",
    desc: "เดินท่อ ติดตั้งอุปกรณ์ และซ่อมจุดรั่วซึมตามอาคาร",
    icon: "/service_plumbing_Icon.svg",
  },
  {
    title: "ทาสี ภายใน/ภายนอก",
    desc: "เตรียมผิวและทาสีตามมาตรฐาน งานเรียบเนียน",
    icon: "/service_paint_Icon.svg",
  },
  {
    title: "สำรวจหน้างาน/ให้คำปรึกษา",
    desc: "นัดดูพื้นที่ แนะนำแนวทาง และสรุปรายละเอียดก่อนเริ่มงาน",
    icon: "/service_sitevisit_Icon.svg",
  },
];

export default function ServicesPage() {
  return (
    <main className="px-4 md:px-10 xl:px-[190px]">
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
        {SERVICES.map((s, i) => (
          <div key={i} className="text-center">
            <div
              className="mx-auto w-16 h-16 rounded-2xl border flex items-center justify-center"
              style={{
                borderColor: `${BRAND}33`,     // 20% opacity
                backgroundColor: `${BRAND}14`, // ~8% opacity
              }}
            >
              <Image
                src={s.icon}
                alt={s.title}
                width={28}
                height={28}
                className="object-contain"
                priority={i < 3}
              />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <div className="text-center my-12 md:my-14">
        <Link
          href="/portfolio"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-white hover:opacity-95"
          style={{ backgroundColor: BRAND }}
        >
          ดูเพิ่มเติม
        </Link>
      </div>
    </main>
  );
}
