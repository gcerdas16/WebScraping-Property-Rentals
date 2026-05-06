"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search, RotateCcw, ChevronDown } from "lucide-react";

const PROPERTY_TYPES = ["Apartamento", "Casa", "Local", "Oficina", "Bodega", "Habitación", "Terreno"];
const BEDROOMS       = ["1", "2", "3", "4", "5+"];

export default function Filters() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const get = (key: string) => searchParams.get(key) ?? "";

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`/listings?${params.toString()}`);
  }, [router, searchParams]);

  const clear = () => router.push("/listings");
  const hasFilters = ["type", "city", "propertyType", "bedrooms", "minPrice", "maxPrice"].some(k => searchParams.has(k));

  return (
    <div className="bg-white border border-[#e0e0e0] rounded-[10px] p-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status */}
        <FilterSelect
          value={get("type")}
          onChange={v => update("type", v)}
          placeholder="Estado"
          options={[
            { value: "alquiler", label: "Alquiler" },
            { value: "venta",    label: "Venta" },
          ]}
        />

        {/* Property type */}
        <FilterSelect
          value={get("propertyType")}
          onChange={v => update("propertyType", v)}
          placeholder="Tipo"
          options={PROPERTY_TYPES.map(t => ({ value: t, label: t }))}
        />

        {/* Bedrooms */}
        <FilterSelect
          value={get("bedrooms")}
          onChange={v => update("bedrooms", v)}
          placeholder="Habitaciones"
          options={BEDROOMS.map(b => ({ value: b, label: b === "5+" ? "5+ hab." : `${b} hab.` }))}
        />

        {/* Price min */}
        <div className="relative">
          <input
            type="number"
            placeholder="Precio mín."
            value={get("minPrice")}
            onChange={e => update("minPrice", e.target.value)}
            className="h-[48px] w-[130px] px-4 text-[14px] border border-[#e0e0e0] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary text-dark"
          />
        </div>

        {/* Price max */}
        <div className="relative">
          <input
            type="number"
            placeholder="Precio máx."
            value={get("maxPrice")}
            onChange={e => update("maxPrice", e.target.value)}
            className="h-[48px] w-[130px] px-4 text-[14px] border border-[#e0e0e0] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary text-dark"
          />
        </div>

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={clear}
            className="h-[48px] w-[48px] flex items-center justify-center border border-[#e0e0e0] rounded-[10px] text-muted hover:text-primary hover:border-primary transition-colors"
            title="Limpiar filtros"
          >
            <RotateCcw size={18} />
          </button>
        )}

        {/* Search button */}
        <button
          className="h-[48px] px-[30px] bg-primary text-white font-bold text-[14px] rounded-[10px] hover:bg-primary-dark transition-colors flex items-center gap-2 ml-auto"
        >
          <Search size={16} />
          Buscar
        </button>
      </div>
    </div>
  );
}

function FilterSelect({
  value, onChange, placeholder, options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none h-[48px] pl-4 pr-9 text-[14px] border border-[#e0e0e0] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary text-dark bg-white cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
    </div>
  );
}
