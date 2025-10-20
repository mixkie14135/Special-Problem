import Link from "next/link";
import Image from "next/image";

const BRAND = "#E2AC24";

export default function SiteFooter() {
  return (
    <footer className="bg-[#F4F4F2] py-10 text-center text-sm text-gray-700">
      <div className="mx-auto max-w-6xl">
        <Image
          src="/logo_brand.svg"
          alt="Bon Plus Thai"
          width={120}
          height={56}
          className="mx-auto mb-4"
        />
        <nav className="flex items-center justify-center gap-10 mb-4">
          <Link href="/" className="hover:underline">หน้าแรก</Link>
          <Link href="/services" className="hover:underline">บริการของเรา</Link>
          <Link href="/portfolio" className="hover:underline">ผลงานของเรา</Link>
          <Link href="/estimate" className="hover:underline">ประเมินราคาเบื้องต้น</Link>
          <Link href="/request-quote" className="hover:underline">ขอใบเสนอราคา</Link>
        </nav>
        <div className="text-xs">© {new Date().getFullYear()} บอน พลัส. สงวนลิขสิทธิ์ทั้งหมด</div>
      </div>

      {/* เส้นสีแบรนด์บางๆ ด้านล่าง (optional) */}
      {/* <div style={{ backgroundColor: `${BRAND}1A`, height: 6 }} /> */}
    </footer>
  );
}
