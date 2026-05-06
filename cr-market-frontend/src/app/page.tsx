import Link from "next/link";
import { Search, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Listing } from "@/types/listing";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";

async function getHomeData() {
  const [
    { count: totalAlquiler },
    { count: totalVenta },
    { data: featured },
  ] = await Promise.all([
    supabase.from("listings").select("*", { count: "exact", head: true }).eq("transaction_type", "alquiler"),
    supabase.from("listings").select("*", { count: "exact", head: true }).eq("transaction_type", "venta"),
    supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(6),
  ]);
  return {
    alquiler: totalAlquiler ?? 0,
    venta:    totalVenta    ?? 0,
    featured: (featured ?? []) as Listing[],
  };
}

const PROPERTY_TYPES = ["Apartamento", "Casa", "Local", "Oficina", "Bodega"];
const CITIES         = ["San José", "Heredia", "Alajuela", "Cartago"];

export default async function HomePage() {
  const { alquiler, venta, featured } = await getHomeData();
  const total = alquiler + venta;

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative bg-white overflow-hidden">
        {/* Figma-matched subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(191,231,246,0.3)] to-transparent pointer-events-none" />

        <div className="relative max-w-[1290px] mx-auto px-4 py-[120px]">
          <div className="flex flex-col md:flex-row items-center gap-[60px]">
            {/* Left: text */}
            <div className="flex-1 flex flex-col gap-[30px]">
              <div className="flex flex-col gap-[20px]">
                <p className="font-sans text-[22px] leading-[28px] text-dark">
                  Más de{" "}
                  <span className="text-primary font-bold">{total.toLocaleString()}+</span>
                  {" "}propiedades disponibles en Costa Rica
                </p>
                <h1 className="font-subtitle font-bold text-[64px] leading-[1.2] text-dark uppercase">
                  Encontrá tu <br />
                  próxima{" "}
                  <span className="text-primary">propiedad</span>
                </h1>
              </div>

              {/* Quick search */}
              <div className="flex flex-col sm:flex-row gap-3 max-w-[600px]">
                <div className="relative flex-1">
                  <select
                    className="appearance-none w-full h-[56px] pl-4 pr-10 text-[14px] border border-[#e0e0e0] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary text-dark bg-white cursor-pointer"
                    defaultValue=""
                  >
                    <option value="">Tipo de transacción</option>
                    <option value="alquiler">Alquiler</option>
                    <option value="venta">Venta</option>
                  </select>
                </div>
                <Link
                  href="/listings"
                  className="h-[56px] px-[30px] bg-primary text-white font-bold text-[18px] rounded-[10px] hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Search size={20} />
                  Explorar
                </Link>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-[40px] pt-2">
                <div>
                  <p className="font-black text-[28px] text-primary leading-tight">{alquiler.toLocaleString()}</p>
                  <p className="text-[14px] text-muted">En Alquiler</p>
                </div>
                <div className="w-px h-10 bg-[#e0e0e0]" />
                <div>
                  <p className="font-black text-[28px] text-primary leading-tight">{venta.toLocaleString()}</p>
                  <p className="text-[14px] text-muted">En Venta</p>
                </div>
                <div className="w-px h-10 bg-[#e0e0e0]" />
                <div>
                  <p className="font-black text-[28px] text-primary leading-tight">4</p>
                  <p className="text-[14px] text-muted">Provincias</p>
                </div>
              </div>
            </div>

            {/* Right: decorative property card stack */}
            <div className="hidden md:flex flex-1 justify-end relative h-[480px]">
              <div className="absolute right-0 top-0 w-[460px] h-[460px] bg-primary rounded-[10px] opacity-10" />
              <div className="absolute right-6 top-6 w-[460px] h-[460px] bg-primary rounded-[10px] opacity-5" />
              <div className="relative w-[460px] h-[460px] rounded-[10px] overflow-hidden bg-[#e8eef5] flex items-center justify-center">
                <Building2 size={120} className="text-primary opacity-20" />
                <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm px-6 py-4 rounded-b-[10px]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-[26px] text-primary">10k+</p>
                      <p className="text-[14px] text-muted">Agentes exclusivos</p>
                    </div>
                    <p className="text-[14px] text-muted">Actualización diaria</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Properties ── */}
      <section className="bg-surface py-[80px]">
        <div className="max-w-[1290px] mx-auto px-4">
          <div className="flex items-end justify-between mb-[40px]">
            <div>
              <p className="font-sans text-[14px] text-primary font-bold uppercase tracking-widest mb-2">Destacadas</p>
              <h2 className="font-subtitle font-bold text-[36px] text-dark leading-[1.2]">Propiedades recientes</h2>
            </div>
            <Link
              href="/listings"
              className="hidden sm:flex h-[48px] px-[30px] items-center justify-center border border-primary text-primary font-bold text-[14px] rounded-[10px] hover:bg-primary hover:text-white transition-colors whitespace-nowrap"
            >
              Ver todas
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[30px]">
            {featured.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>

          <div className="text-center mt-[40px] sm:hidden">
            <Link
              href="/listings"
              className="inline-flex h-[48px] px-[30px] items-center justify-center border border-primary text-primary font-bold text-[14px] rounded-[10px] hover:bg-primary hover:text-white transition-colors"
            >
              Ver todas las propiedades
            </Link>
          </div>
        </div>
      </section>

      {/* ── Browse by city ── */}
      <section className="py-[80px]">
        <div className="max-w-[1290px] mx-auto px-4">
          <div className="mb-[40px]">
            <p className="font-sans text-[14px] text-primary font-bold uppercase tracking-widest mb-2">Explorar</p>
            <h2 className="font-subtitle font-bold text-[36px] text-dark leading-[1.2]">Buscar por zona</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CITIES.map(city => (
              <Link
                key={city}
                href={`/listings?city=${encodeURIComponent(city)}`}
                className="group rounded-[10px] border border-[#e0e0e0] p-8 text-center hover:border-primary hover:bg-primary transition-all"
              >
                <Building2 size={32} className="mx-auto mb-3 text-primary group-hover:text-white transition-colors" />
                <p className="font-bold text-[16px] text-dark group-hover:text-white transition-colors">{city}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Browse by type ── */}
      <section className="py-[40px] pb-[80px]">
        <div className="max-w-[1290px] mx-auto px-4">
          <div className="mb-[40px]">
            <p className="font-sans text-[14px] text-primary font-bold uppercase tracking-widest mb-2">Tipo</p>
            <h2 className="font-subtitle font-bold text-[36px] text-dark leading-[1.2]">Tipo de propiedad</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {PROPERTY_TYPES.map(type => (
              <Link
                key={type}
                href={`/listings?propertyType=${encodeURIComponent(type)}`}
                className="px-6 py-3 rounded-[10px] border border-[#e0e0e0] font-bold text-[14px] text-dark hover:bg-primary hover:text-white hover:border-primary transition-all"
              >
                {type}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
