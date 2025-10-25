// src/app/estimate/layout.js
import PublicNavbar from "@/components/nav/PublicNavbar";
import SiteFooter from "@/components/footer/SiteFooter";    

export default function EstimateLayout({ children }) {
  return (
    <>
      <PublicNavbar noShadow />
      {children}
      <SiteFooter />
    </>
  );
}
