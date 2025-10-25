// frontend/src/app/(customer)/my/layout.js
import PublicNavbar from "@/components/nav/PublicNavbar";
import SiteFooter from "@/components/footer/SiteFooter";

export default function MyLayout({ children }) {
  return (
    <>
      <PublicNavbar />
      {children}
      {/* เพิ่มคลาส mt-10 (Margin Top ขนาด 10 หรือประมาณ 2.5rem) 
        ให้กับ SiteFooter เพื่อสร้างระยะห่าง
      */}
      <div className="mt-50">
        <SiteFooter />
      </div>
    </>
  );
}