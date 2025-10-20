// src/app/(auth)/layout.js
import PublicNavbar from "@/components/nav/PublicNavbar";
import SiteFooter from "@/components/footer/SiteFooter";

export default function AuthLayout({ children }) {
  return (
    <>
      <PublicNavbar noShadow />
      {children}
      <SiteFooter />
    </>
  );
}
