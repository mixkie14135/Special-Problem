// frontend/src/app/(customer)/my/layout.js
import PublicNavbar from "@/components/nav/PublicNavbar";
import SiteFooter from "@/components/footer/SiteFooter";


export default function MyLayout({ children }) {
  return (
    <>
      <PublicNavbar />
      {children}
      <SiteFooter />
    </>
  );
}
