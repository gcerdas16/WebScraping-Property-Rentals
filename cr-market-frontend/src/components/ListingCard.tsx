import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Bed, Bath, Maximize2 } from "lucide-react";
import { Listing, formatPriceBoth } from "@/types/listing";

export default function ListingCard({ listing }: { listing: Listing }) {
  const price  = formatPriceBoth(listing);
  const image  = listing.image_urls?.[0] ?? null;
  const isRent = listing.transaction_type === "alquiler";

  const amenities = [
    listing.bedrooms_ai   != null ? { icon: <Bed size={20} />,       val: `${listing.bedrooms_ai}` }   : null,
    listing.bathrooms_ai  != null ? { icon: <Bath size={20} />,      val: `${listing.bathrooms_ai}` }  : null,
    listing.square_meters != null ? { icon: <Maximize2 size={20} />, val: `${listing.square_meters} m²` } : null,
  ].filter((x): x is { icon: JSX.Element; val: string } => x !== null);

  return (
    <Link
      href={`/listings/${listing.source_id}`}
      className="group bg-white rounded-[10px] border border-[#e0e0e0] overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
    >
      {/* Image */}
      <div className="relative h-[274px] bg-gray-50 overflow-hidden shrink-0">
        {image ? (
          <Image
            src={image}
            alt={listing.title ?? "Propiedad"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <Maximize2 size={48} />
          </div>
        )}
        {/* Tag */}
        <span className="absolute top-3 left-3 bg-white border border-[#e0e0e0] text-dark text-[14px] font-normal px-2 py-[5px] rounded-[4px] leading-tight">
          {isRent ? "En Alquiler" : "En Venta"}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-[24px] p-[30px] flex-1">

        {/* Upper block */}
        <div className="flex flex-col gap-[16px] border-b border-[#e0e0e0] pb-[30px]">
          {/* Title */}
          <p className="font-bold text-[18px] leading-[1.25] text-dark line-clamp-2">
            {listing.title ?? "Sin título"}
          </p>

          {/* Location */}
          {(listing.location_city || listing.location_province) && (
            <div className="flex items-center gap-[6px]">
              <MapPin size={20} className="text-muted shrink-0" />
              <span className="text-[16px] leading-[1.6] text-muted truncate">
                {[listing.location_city, listing.location_province].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          {/* Amenities with separators */}
          {amenities.length > 0 && (
            <div className="flex items-center">
              {amenities.map((a, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="w-px h-5 bg-[#e0e0e0] mx-[15px]" />}
                  <div className="flex items-center gap-[6px]">
                    <span className="text-muted">{a.icon}</span>
                    <span className="text-[16px] text-muted whitespace-nowrap">{a.val}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Lower block: price + CTA */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-baseline gap-1">
            <span className="font-black text-[28px] leading-[1.25] text-primary">{price.primary}</span>
            {isRent && <span className="text-[14px] leading-[1.5] text-muted">/mes</span>}
          </div>
          <span className="border border-primary text-primary font-bold text-[14px] h-[40px] px-[16px] rounded-[10px] flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors whitespace-nowrap">
            Ver Detalle
          </span>
        </div>

      </div>
    </Link>
  );
}
