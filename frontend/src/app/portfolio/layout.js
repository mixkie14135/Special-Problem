// src/app/portfolio/layout.js
import PublicNavbar from "@/components/nav/PublicNavbar";
import SiteFooter from "@/components/footer/SiteFooter";    

export default function PortfolioLayout({ children }) {
  return (
    <>
      <PublicNavbar noShadow />
      {children}
      <SiteFooter />
    </>
  );
}
