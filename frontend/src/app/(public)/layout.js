// src/app/(public)/layout.js
import PublicNavbar from "@/components/nav/PublicNavbar";
import SiteFooter from "@/components/footer/SiteFooter";    

export default function PublicLayout({ children }) {
  return (
    <>
      <PublicNavbar noShadow/>
      {children}
      <SiteFooter />
    </>
  );
}
