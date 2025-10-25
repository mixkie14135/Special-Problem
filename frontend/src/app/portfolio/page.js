"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { fileUrl } from "@/lib/urls";

const BRAND = "#E2AC24";

// fallback ใช้เลย์เอาต์เดิมเมื่อยังไม่มีข้อมูล
const FALLBACK = Array.from({ length: 6 }).map((_, i) => ({
  id: `fb-${i + 1}`,
  dateText: "—",
  title: "ตัวอย่างผลงาน",
  excerpt: "ข้อมูลกำลังจะมาเร็ว ๆ นี้",
  imageUrl: "",
}));

const ROW_SIZE = 3;
const INITIAL_ROWS = 1;
const LOAD_ROWS = 2;

function ImageMock() {
  return (
    <div className="h-[180px] w-full bg-gray-200/80 rounded-md flex items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500" aria-hidden>
        <path d="M21 19V5a2 2 0 0 0-2-2H5C3.89 3 3 3.9 3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 11.5A1.5 1.5 0 1 1 10 10a1.5 1.5 0 0 1-1.5 1.5zM5 19l4.5-6 3.5 4.5 2.5-3L19 19H5z" />
      </svg>
    </div>
  );
}

export default function PortfolioPage() {
  const [allPosts, setAllPosts] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  // โหลดจาก API จริง
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await apiGet("/portfolio", { limit: 30, order: "desc" });
        const rows = data?.data || [];
        if (alive && rows.length) {
          const mapped = rows.map((p) => ({
            id: p.id,
            dateText: p.occurredAt
              ? new Date(p.occurredAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : p.timeNote || "",
            title: p.title,
            excerpt: p.description || "",
            imageUrl: p.imageUrl || "",
          }));
          setAllPosts(mapped);
        }
      } catch {
        // ถ้า error ให้แสดง fallback เงียบ ๆ
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // จำนวน “การ์ด” ที่โชว์
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS * ROW_SIZE);
  const visiblePosts = useMemo(() => allPosts.slice(0, visibleCount), [allPosts, visibleCount]);
  const hasMore = visibleCount < allPosts.length;

  const onLoadMore = () => {
    if (!hasMore) return;
    const next = visibleCount + LOAD_ROWS * ROW_SIZE;
    setVisibleCount(Math.min(next, allPosts.length));
  };

  return (
    <main className="px-4 md:px-10 xl:px-[190px] py-8 md:py-10">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8">ผลงานของเรา</h1>

      {/* กริดการ์ด */}
      <section className="mt-4 grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: ROW_SIZE * INITIAL_ROWS }).map((_, i) => (
              <article key={`sk-${i}`} className="space-y-3">
                <div className="h-[180px] w-full rounded-md bg-gray-100 animate-pulse" />
                <div className="pt-2 border-t">
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                  <div className="mt-2 h-4 w-48 bg-gray-100 rounded" />
                  <div className="mt-1 h-3 w-64 bg-gray-100 rounded" />
                </div>
              </article>
            ))
          : visiblePosts.map((p) => (
              <article key={p.id} className="space-y-3">
                {p.imageUrl ? (
                  <div className="relative h-[180px] w-full overflow-hidden rounded-md">
                    <img
                      src={fileUrl(p.imageUrl)}
                      alt={p.title}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <ImageMock />
                )}
                <div className="pt-2 border-t">
                  {p.dateText ? <p className="text-xs text-gray-500">{p.dateText}</p> : null}
                  <h3 className="mt-2 text-lg font-semibold leading-snug">{p.title}</h3>
                  {p.excerpt ? (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-3">{p.excerpt}</p>
                  ) : null}
                  <Link href={`/portfolio/${p.id}`} className="mt-2 inline-block text-sm underline">
                    ดูรายละเอียด
                  </Link>
                </div>
              </article>
            ))}
      </section>

      {/* ปุ่มโหลดเพิ่ม */}
      {!loading && (
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
      )}
    </main>
  );
}
