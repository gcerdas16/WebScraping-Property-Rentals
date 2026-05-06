import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Listing } from "@/types/listing";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import Filters from "./Filters";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 12;

type SearchParams = {
  type?:         string;
  city?:         string;
  propertyType?: string;
  bedrooms?:     string;
  minPrice?:     string;
  maxPrice?:     string;
  sort?:         string;
  page?:         string;
};

async function getListings(params: SearchParams) {
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let query = supabase
    .from("listings")
    .select("*", { count: "exact" })
    .range(from, to);

  if (params.type)         query = query.eq("transaction_type", params.type);
  if (params.city)         query = query.eq("location_city", params.city);
  if (params.propertyType) query = query.eq("property_type_ai", params.propertyType);
  if (params.minPrice)     query = query.gte("price_final_crc", parseInt(params.minPrice));
  if (params.maxPrice)     query = query.lte("price_final_crc", parseInt(params.maxPrice));

  if (params.bedrooms) {
    const b = params.bedrooms;
    if (b === "5+") query = query.gte("bedrooms_ai", 5);
    else             query = query.eq("bedrooms_ai", parseInt(b));
  }

  switch (params.sort) {
    case "price_asc":  query = query.order("price_final_crc", { ascending: true,  nullsFirst: false }); break;
    case "price_desc": query = query.order("price_final_crc", { ascending: false, nullsFirst: false }); break;
    default:           query = query.order("created_at", { ascending: false }); break;
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { listings: (data ?? []) as Listing[], total: count ?? 0, page, pages: Math.ceil((count ?? 0) / PAGE_SIZE) };
}

export default async function ListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { listings, total, page, pages } = await getListings(searchParams);

  const buildPageUrl = (p: number) => {
    const sp = new URLSearchParams(searchParams as Record<string, string>);
    sp.set("page", String(p));
    return `/listings?${sp.toString()}`;
  };

  const sortUrl = (sort: string) => {
    const sp = new URLSearchParams(searchParams as Record<string, string>);
    sp.set("sort", sort);
    sp.delete("page");
    return `/listings?${sp.toString()}`;
  };

  const pageTitle =
    searchParams.type === "alquiler" ? "Propiedades en Alquiler" :
    searchParams.type === "venta"    ? "Propiedades en Venta"    : "Listado de Propiedades";

  return (
    <>
      <Navbar />
      <div className="max-w-[1290px] mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[14px] text-muted mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
          <span className="text-[#e0e0e0]">/</span>
          <span className="text-dark font-medium">Propiedades</span>
        </div>

        {/* Heading + sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-subtitle font-bold text-[42px] leading-[1.2] text-dark">{pageTitle}</h1>
            <p className="text-[14px] text-muted mt-1">{total.toLocaleString()} resultados</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-muted hidden sm:block">Ordenar:</span>
            <Link href={sortUrl("newest")}
              className={`text-[13px] px-3 py-1.5 rounded-[10px] border transition-all ${!searchParams.sort || searchParams.sort === "newest" ? "bg-primary text-white border-primary" : "border-[#e0e0e0] text-muted hover:border-primary"}`}>
              Recientes
            </Link>
            <Link href={sortUrl("price_asc")}
              className={`text-[13px] px-3 py-1.5 rounded-[10px] border transition-all ${searchParams.sort === "price_asc" ? "bg-primary text-white border-primary" : "border-[#e0e0e0] text-muted hover:border-primary"}`}>
              Precio ↑
            </Link>
            <Link href={sortUrl("price_desc")}
              className={`text-[13px] px-3 py-1.5 rounded-[10px] border transition-all ${searchParams.sort === "price_desc" ? "bg-primary text-white border-primary" : "border-[#e0e0e0] text-muted hover:border-primary"}`}>
              Precio ↓
            </Link>
          </div>
        </div>

        {/* Horizontal filter bar */}
        <Suspense>
          <Filters />
        </Suspense>

        {/* Grid */}
        <div className="mt-8">
          {listings.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-[18px] font-bold text-dark mb-2">Sin resultados</p>
              <p className="text-[14px] text-muted">Intentá con otros filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[30px]">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {page > 1 && (
              <Link href={buildPageUrl(page - 1)}
                className="p-2 rounded-[10px] border border-[#e0e0e0] hover:border-primary text-muted hover:text-primary transition-all">
                <ChevronLeft size={18} />
              </Link>
            )}
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
              const p = pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= pages - 3 ? pages - 6 + i : page - 3 + i;
              return (
                <Link key={p} href={buildPageUrl(p)}
                  className={`w-9 h-9 flex items-center justify-center rounded-[10px] text-[14px] transition-all ${
                    p === page ? "bg-primary text-white" : "border border-[#e0e0e0] text-muted hover:border-primary"
                  }`}>
                  {p}
                </Link>
              );
            })}
            {page < pages && (
              <Link href={buildPageUrl(page + 1)}
                className="p-2 rounded-[10px] border border-[#e0e0e0] hover:border-primary text-muted hover:text-primary transition-all">
                <ChevronRight size={18} />
              </Link>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
