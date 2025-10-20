// src/app/(public)/portfolio/page.js
"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

const BRAND = "#E2AC24";

// mock 12 ชิ้น (พอให้กดโหลดได้ 1–2 รอบ)
const ALL_POSTS = Array.from({ length: 12 }).map((_, i) => ({
  id: `post-${i + 1}`,
  // แค่เดโมวันที่สวยๆ
  date: i === 0 ? "8 August 2025" : i === 1 ? "3 August 2025" : i === 2 ? "24 May 2025" : "10 May 2025",
  title:
    i % 3 === 0
      ? "Lorem ipsum dolor sit amet, consectetur adipiscing elit"
      : i % 3 === 1
      ? "Aenean vulputate sapien vitae tortor congue faucibus"
      : "Curabitur id urna at turpis malesuada placerat",
  excerpt:
    "ข้อความตัวอย่างสำหรับคำโปรยสั้น ๆ ของชิ้นงาน เพื่อทดสอบการจัดวางและระยะห่างขององค์ประกอบในหน้าเดโมนี้",
}));

const ROW_SIZE = 3;       // 1 แถวมี 3 การ์ด (ตาม layout desktop)
const INITIAL_ROWS = 1;   // เริ่มโชว์ 1 แถว
const LOAD_ROWS = 2;      // กดครั้งนึง เพิ่ม 1-2 แถว (ปรับเป็น 1 ถ้าต้องการทีละแถว)

function ImageMock() {
  return (
    <div className="h-[180px] w-full bg-gray-200/80 rounded-md flex items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500" aria-hidden>
        <path d="M21 19V5a2 2 0 0 0-2-2H5C3.89 3 3 3.9 3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 11.5A1.5 1.5 0 1 1 10 10a1.5 1.5 0 0 1-1.5 1.5zM5 19l4.5-6 3.5 4.5 2.5-3L19 19H5z"/>
      </svg>
    </div>
  );
}

export default function PortfolioPage() {
  // จำนวน “การ์ด” ที่โชว์อยู่ตอนนี้
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS * ROW_SIZE);
  const visiblePosts = useMemo(() => ALL_POSTS.slice(0, visibleCount), [visibleCount]);
  const hasMore = visibleCount < ALL_POSTS.length;

  const onLoadMore = () => {
    if (!hasMore) return; // กันพลาด ไม่ทำอะไรถ้าหมดแล้ว
    const nextCount = visibleCount + LOAD_ROWS * ROW_SIZE;
    setVisibleCount(Math.min(nextCount, ALL_POSTS.length));
  };

  return (
    <main className="px-4 md:px-10 xl:px-[190px] py-8 md:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-bold">ผลงานของเรา</h1>

        {/* เรียงตาม (mock) */}
        <div className="text-sm">
          <label className="mr-2 text-gray-700">เรียงตาม:</label>
          <select className="border rounded-md px-2 py-1 text-sm" defaultValue="latest" aria-label="เรียงตาม">
            <option value="latest">ล่าสุด</option>
            <option value="oldest">เก่าสุด</option>
            <option value="az">A–Z</option>
            <option value="za">Z–A</option>
          </select>
        </div>
      </div>

      {/* กริดการ์ด */}
      <section className="mt-8 grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePosts.map((p) => (
          <article key={p.id} className="space-y-3">
            <ImageMock />
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">{p.date}</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug">{p.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{p.excerpt}</p>
              <Link href={`/portfolio/${p.id}`} className="mt-2 inline-block text-sm underline">
                ดูรายละเอียด
              </Link>
            </div>
          </article>
        ))}
      </section>

      {/* ปุ่มโหลดเพิ่ม */}
      <div className="text-center mt-10 md:mt-12">
        <button
          type="button"
          onClick={onLoadMore}
          disabled={!hasMore}
          className={`px-6 py-3 rounded-md text-white ${
            hasMore ? "hover:opacity-95" : "opacity-60 cursor-not-allowed"
          }`}
          style={{ backgroundColor: BRAND }}
        >
          {hasMore ? "โหลดเพิ่มเติม" : "ไม่มีรายการเพิ่มเติม"}
        </button>
      </div>
    </main>
  );
}
