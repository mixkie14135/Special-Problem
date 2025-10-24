// src/app/request-quote/layout.js
import PublicNavbar from "@/components/nav/PublicNavbar";
import SiteFooter from "@/components/footer/SiteFooter";    

export default function RequestQuoteLayout({ children }) {
  return (
    <>
      <PublicNavbar noShadow />
      {children}
      <SiteFooter />
    </>
  );
}
