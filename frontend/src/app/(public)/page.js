// หน้า หลักของเว็บไซต์ (Landing Page)
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* ===== HERO (สูง 528px) ===== */}
      <section
        className="relative h-[528px] overflow-hidden bg-no-repeat bg-bottom"
        style={{
          backgroundImage: "url('/Hero_Background.png')",   // ใส่ไฟล์ PNG ไล่สีของคุณ
          backgroundSize: "100% 528px",             // ให้พอดีกับส่วน hero
        }}
      >
        <div className="h-full grid md:grid-cols-2 items-center gap-10 md:px-10 px-4 xl:px-[190px] xl:gap-x-[252px]">
          {/* ซ้าย: ข้อความ */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Let’s realize <br /> your best building <br /> construction
            </h1>
            <p className="mt-5 text-gray-600 max-w-[52ch]">
              เราคือทีมรับเหมามืออาชีพ เน้นคุณภาพ ความปลอดภัย และความตรงเวลา
              พร้อมส่งมอบงานที่คุ้มค่า ครอบคลุมงานบ้านจนถึงงานโครงการขนาดใหญ่
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/request-quote" className="px-4 py-2 rounded-full bg-black text-white hover:bg-gray-900">
                ขอใบเสนอราคา
              </Link>
              <Link href="/estimate" className="px-4 py-2 rounded-full bg-[#E2AC24] text-white hover:bg-[#c89a1f]">
                ประเมินราคาเบื้องต้น
              </Link>
            </div>
          </div>

          {/* ขวา: รูป Hero (388×445) */}
          <div className="flex items-end justify-end">
            <img
              src="/Hero_LandingPage.png"
              alt="งานก่อสร้าง"
              className="w-[388px] h-[445px] object-contain"
            />
          </div>
        </div>
      </section>

      {/* ===== WHY US ===== */}
      <main className="px-4 md:px-10 xl:px-[190px]">
        <section className="grid md:grid-cols-2 gap-10 py-20">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold">ทำไมต้องเลือกเรา?</h2>
            <p className="mt-4 text-gray-600">
              เราคือทีมผู้รับเหมาที่มีประสบการณ์กว่า 10 ปี พร้อมช่างงานที่มีคุณภาพ
              ตรงเวลา และราคายุติธรรม ครอบคลุมงานบ้านจนถึงงานขนาดใหญ่
            </p>
            <ul className="mt-5 space-y-3 text-gray-800">
              <li>✅ ทีมงานมืออาชีพและประสบการณ์สูง</li>
              <li>✅ โปร่งใส ประเมินราคาชัดเจน โปร่งใส</li>
              <li>✅ งานตรงเวลา มาตรฐานคุณภาพ</li>
              <li>✅ บริการครบวงจร ตั้งแต่งานโครงสร้างถึงงานดีไซน์</li>
            </ul>
            <Link href="/services" className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded border bg-black text-white hover:bg-gray-900">
              บริการของเรา <span aria-hidden>↗</span>
            </Link>
          </div>

          <div className="flex items-center justify-end">
            <img
              src="/why_us.png"
              alt="หน้างาน"
              className="w-[333px] h-[250px] object-contain"
            />
          </div>
        </section>
      </main>
    </>
  );
}
