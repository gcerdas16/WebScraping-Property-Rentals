import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Bed, Bath, Car, Maximize2, Phone, ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Listing, formatPriceBoth } from "@/types/listing";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";

async function getListing(source_id: string): Promise<Listing | null> {
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("source_id", source_id)
    .single();
  return data ?? null;
}

async function getSimilar(listing: Listing): Promise<Listing[]> {
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("transaction_type", listing.transaction_type)
    .neq("source_id", listing.source_id)
    .order("created_at", { ascending: false })
    .limit(3);
  return (data ?? []) as Listing[];
}

export default async function ListingDetailPage({ params }: { params: { source_id: string } }) {
  const listing = await getListing(params.source_id);
  if (!listing) notFound();

  const [price, similar] = await Promise.all([
    Promise.resolve(formatPriceBoth(listing)),
    getSimilar(listing),
  ]);

  const images    = listing.image_urls ?? [];
  const mainImage = images[0] ?? null;
  const thumbs    = images.slice(1, 5);
  const isRent    = listing.transaction_type === "alquiler";

  return (
    <>
      <Navbar />
      <div className="max-w-[1290px] mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[14px] text-muted mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
          <span>/</span>
          <Link href="/listings" className="hover:text-primary transition-colors">Propiedades</Link>
          <span>/</span>
          <span className="text-dark font-medium line-clamp-1">{listing.title ?? "Detalle"}</span>
        </div>

        {/* Title + Price row */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-subtitle font-bold text-[36px] leading-[1.2] text-dark mb-2">
              {listing.title ?? "Propiedad"}
            </h1>
            {(listing.location_city || listing.location_province) && (
              <div className="flex items-center gap-1 text-[16px] text-muted">
                <MapPin size={18} className="shrink-0" />
                <span>{[listing.location_city, listing.location_province, "Costa Rica"].filter(Boolean).join(", ")}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="font-black text-[42px] leading-tight text-primary">{price.primary}</p>
            {isRent && <p className="text-[14px] text-muted">/mes</p>}
            {price.secondary && <p className="text-[14px] text-muted">{price.secondary}</p>}
          </div>
        </div>

        {/* Image gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10 rounded-[10px] overflow-hidden">
          {/* Main image */}
          <div className="md:col-span-2 relative h-[400px] bg-gray-100">
            {mainImage ? (
              <Image src={mainImage} alt={listing.title ?? "Propiedad"} fill className="object-cover" sizes="(max-width: 768px) 100vw, 66vw" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-200">
                <Maximize2 size={60} />
              </div>
            )}
          </div>
          {/* Thumbnails */}
          <div className="grid grid-cols-2 gap-3 h-[400px]">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="relative bg-gray-100 rounded-[4px] overflow-hidden">
                {thumbs[i] ? (
                  <Image src={thumbs[i]} alt="" fill className="object-cover" sizes="20vw" />
                ) : (
                  <div className="w-full h-full bg-gray-50" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main content + Sidebar */}
        <div className="flex gap-8">
          {/* Left content */}
          <div className="flex-1 min-w-0">

            {/* Overview stats */}
            <div className="bg-white border border-[#e0e0e0] rounded-[10px] p-[30px] mb-6">
              <h2 className="font-bold text-[22px] text-dark mb-6">Resumen</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {listing.bedrooms_ai != null && (
                  <Stat icon={<Bed size={24} className="text-primary" />} label="Habitaciones" value={String(listing.bedrooms_ai)} />
                )}
                {listing.bathrooms_ai != null && (
                  <Stat icon={<Bath size={24} className="text-primary" />} label="Baños" value={String(listing.bathrooms_ai)} />
                )}
                {listing.parking != null && listing.parking > 0 && (
                  <Stat icon={<Car size={24} className="text-primary" />} label="Parqueos" value={String(listing.parking)} />
                )}
                {listing.square_meters != null && (
                  <Stat icon={<Maximize2 size={24} className="text-primary" />} label="Área" value={`${listing.square_meters} m²`} />
                )}
              </div>
            </div>

            {/* Information */}
            <div className="bg-white border border-[#e0e0e0] rounded-[10px] p-[30px] mb-6">
              <h2 className="font-bold text-[22px] text-dark mb-6">Información</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[14px]">
                <InfoRow label="Tipo"         value={listing.property_type_ai} />
                <InfoRow label="Transacción"  value={isRent ? "Alquiler" : "Venta"} />
                <InfoRow label="Provincia"    value={listing.location_province} />
                <InfoRow label="Ciudad"       value={listing.location_city} />
                {listing.furnished && (
                  <InfoRow label="Amueblado" value={listing.furnished} />
                )}
                {listing.pets_allowed != null && (
                  <InfoRow label="Mascotas" value={listing.pets_allowed ? "Permitidas" : "No permitidas"} />
                )}
                {listing.deposit_crc != null && (
                  <InfoRow label="Depósito" value={`₡${listing.deposit_crc.toLocaleString("es-CR")}`} />
                )}
                {listing.condominio_name && (
                  <InfoRow label="Condominio" value={listing.condominio_name} />
                )}
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="bg-white border border-[#e0e0e0] rounded-[10px] p-[30px] mb-6">
                <h2 className="font-bold text-[22px] text-dark mb-4">Descripción</h2>
                <p className="text-[16px] text-muted leading-[1.6] whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <aside className="w-[320px] shrink-0 hidden lg:block">
            {/* Price card */}
            <div className="bg-white border border-[#e0e0e0] rounded-[10px] p-[30px] mb-4 sticky top-24">
              <p className="font-bold text-[18px] text-dark mb-1 line-clamp-2">{listing.title ?? "Propiedad"}</p>
              {(listing.location_city || listing.location_province) && (
                <div className="flex items-center gap-1 text-[14px] text-muted mb-4">
                  <MapPin size={14} />
                  <span>{[listing.location_city, listing.location_province].filter(Boolean).join(", ")}</span>
                </div>
              )}

              <div className="border-t border-[#e0e0e0] pt-4 mb-4">
                <p className="text-[14px] text-muted mb-1">{isRent ? "Precio mensual" : "Precio"}</p>
                <p className="font-black text-[32px] text-primary leading-tight">{price.primary}</p>
                {isRent && <p className="text-[14px] text-muted">/mes</p>}
              </div>

              {/* Contact */}
              {listing.contact_phone && (
                <a
                  href={`tel:${listing.contact_phone}`}
                  className="flex items-center gap-3 w-full h-[48px] px-[16px] bg-primary text-white font-bold text-[14px] rounded-[10px] hover:bg-primary-dark transition-colors mb-3"
                >
                  <Phone size={18} />
                  {listing.contact_phone}
                </a>
              )}

              {listing.listing_url && (
                <a
                  href={listing.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-[48px] px-[16px] border border-primary text-primary font-bold text-[14px] rounded-[10px] hover:bg-primary hover:text-white transition-colors"
                >
                  <ExternalLink size={16} />
                  Ver anuncio original
                </a>
              )}

              {listing.seller_name && (
                <p className="text-[12px] text-muted text-center mt-3">Publicado por: {listing.seller_name}</p>
              )}
            </div>
          </aside>
        </div>

        {/* Mobile contact */}
        <div className="lg:hidden mt-6 bg-white border border-[#e0e0e0] rounded-[10px] p-[30px]">
          <h3 className="font-bold text-[18px] text-dark mb-4">Contactar</h3>
          {listing.contact_phone && (
            <a
              href={`tel:${listing.contact_phone}`}
              className="flex items-center gap-3 w-full h-[48px] px-[16px] bg-primary text-white font-bold text-[14px] rounded-[10px] hover:bg-primary-dark transition-colors mb-3"
            >
              <Phone size={18} />
              {listing.contact_phone}
            </a>
          )}
          {listing.listing_url && (
            <a
              href={listing.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-[48px] border border-primary text-primary font-bold text-[14px] rounded-[10px] hover:bg-primary hover:text-white transition-colors"
            >
              <ExternalLink size={16} />
              Ver anuncio original
            </a>
          )}
        </div>

        {/* Similar properties */}
        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="font-subtitle font-bold text-[32px] text-dark mb-8">Propiedades Similares</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[30px]">
              {similar.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          </section>
        )}

        {/* Back */}
        <div className="mt-10">
          <Link href="/listings" className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-primary transition-colors">
            <ArrowLeft size={16} />
            Volver a propiedades
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-[12px] text-muted uppercase tracking-wide">{label}</p>
        <p className="font-bold text-[18px] text-dark">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-muted uppercase tracking-wide">{label}</span>
      <span className="font-medium text-[14px] text-dark capitalize">{value}</span>
    </div>
  );
}
