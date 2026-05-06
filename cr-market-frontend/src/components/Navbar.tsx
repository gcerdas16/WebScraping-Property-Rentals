"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";

export default function Navbar() {
  const path = usePathname();
  const isListings = path.startsWith("/listings");
  const isHome = path === "/";
  const isContact = path.startsWith("/contact");

  return (
    <nav className="bg-white border-b border-[#e0e0e0] sticky top-0 z-40">
      <div className="h-[80px] max-w-[1290px] mx-auto px-4 flex items-center justify-between">
        {/* Logo + Nav links */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-1 w-[220px] shrink-0">
            <Building2 size={36} className="text-primary" />
            <span className="font-black text-[22px] leading-[28px] text-primary">CR Market</span>
          </Link>
          <div className="flex items-center">
            <NavLink href="/"         label="Inicio"       active={isHome} />
            <NavLink href="/listings" label="Propiedades"  active={isListings} />
            <NavLink href="/contact"  label="Contacto"     active={isContact} />
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="/listings?type=alquiler"
            className="h-[48px] px-4 flex items-center justify-center rounded-[10px] font-bold text-[16px] text-dark hover:text-primary transition-colors"
          >
            Alquiler
          </Link>
          <Link
            href="/listings?type=venta"
            className="h-[48px] px-[30px] flex items-center justify-center rounded-[10px] bg-primary text-white font-bold text-[16px] hover:bg-primary-dark transition-colors whitespace-nowrap"
          >
            Comprar
          </Link>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`capitalize font-bold text-[16px] leading-[1.5] px-[30px] py-2 transition-colors ${
        active ? "text-primary" : "text-dark hover:text-primary"
      }`}
    >
      {label}
    </Link>
  );
}
