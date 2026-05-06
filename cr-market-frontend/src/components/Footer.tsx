import Link from "next/link";
import { Building2, MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-[#e0e0e0] mt-16">
      <div className="max-w-[1290px] mx-auto px-4 py-[60px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="md:col-span-1 flex flex-col gap-5">
            <Link href="/" className="flex items-center gap-1">
              <Building2 size={32} className="text-primary" />
              <span className="font-black text-[22px] text-primary">CR Market</span>
            </Link>
            <div className="flex flex-col gap-3 text-[14px] text-muted leading-[1.6]">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="shrink-0 mt-1" />
                <span>San José, Costa Rica</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="shrink-0" />
                <span>(506) 2222-3333</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} className="shrink-0" />
                <span>info@crmarket.cr</span>
              </div>
            </div>
          </div>

          {/* Explorar */}
          <div className="flex flex-col gap-4">
            <p className="font-bold text-[16px] text-dark">Explorar</p>
            <div className="flex flex-col gap-3">
              {[
                { label: "Inicio",       href: "/" },
                { label: "Propiedades",  href: "/listings" },
                { label: "Alquiler",     href: "/listings?type=alquiler" },
                { label: "Comprar",      href: "/listings?type=venta" },
              ].map(({ label, href }) => (
                <Link key={label} href={href} className="text-[14px] text-muted hover:text-primary transition-colors">{label}</Link>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4">
            <p className="font-bold text-[16px] text-dark">Información</p>
            <div className="flex flex-col gap-3">
              {[
                { label: "Contacto",       href: "/contact" },
                { label: "Sobre nosotros", href: "/about" },
                { label: "Precios",        href: "/listings" },
              ].map(({ label, href }) => (
                <Link key={label} href={href} className="text-[14px] text-muted hover:text-primary transition-colors">{label}</Link>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-4">
            <p className="font-bold text-[16px] text-dark">Legal</p>
            <div className="flex flex-col gap-3">
              {[
                "En venta",
                "Términos de uso",
                "Privacidad",
              ].map(item => (
                <span key={item} className="text-[14px] text-muted">{item}</span>
              ))}
            </div>
          </div>

          {/* Suscribirse */}
          <div className="flex flex-col gap-4">
            <p className="font-bold text-[16px] text-dark">Suscribirse</p>
            <p className="text-[14px] text-muted leading-[1.6]">
              Recibí las últimas propiedades directamente en tu correo
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Tu correo"
                className="flex-1 min-w-0 h-[42px] px-3 text-[14px] border border-[#e0e0e0] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
              <button className="h-[42px] px-4 bg-primary text-white text-[14px] font-bold rounded-[10px] hover:bg-primary-dark transition-colors whitespace-nowrap">
                Suscribir
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#e0e0e0] py-5 text-center text-[14px] text-muted">
        © 2026 CR Market · Datos actualizados diariamente desde Facebook Marketplace
      </div>
    </footer>
  );
}
