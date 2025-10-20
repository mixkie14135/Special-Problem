// src/app/services/layout.js
import PublicNavbar from "@/components/nav/PublicNavbar";
import SiteFooter from "@/components/footer/SiteFooter";

export default function ServicesLayout({ children }) {
  return (
    <>
      <PublicNavbar noShadow />
      {children}
      <SiteFooter />
    </>
  );
}