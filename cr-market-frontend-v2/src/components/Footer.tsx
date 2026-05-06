import Link from 'next/link'
import { WHATSAPP_CHANNEL_URL } from '@/lib/config'

export function Footer() {
  return (
    <footer className="bg-ink text-cream mt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 grid grid-cols-2 md:grid-cols-4 gap-12">
        <div className="col-span-2">
          <div className="font-serif text-2xl font-bold tracking-tight">CR Market</div>
          <p className="mt-3 text-sm text-cream/70 max-w-xs leading-relaxed">
            Casas y apartamentos curados en Costa Rica. Sin scroll en Facebook.
          </p>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex mt-6 bg-accent text-ink px-5 py-2.5 text-sm font-bold tracking-wide hover:bg-accent/90 transition-colors"
          >
            Canal de WhatsApp
          </a>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cream/50 font-semibold">
            Explorar
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/listings" className="hover:text-accent">
                Todas las propiedades
              </Link>
            </li>
            <li>
              <Link href="/nuevos" className="hover:text-accent">
                Recién listadas
              </Link>
            </li>
            <li>
              <Link href="/favoritos" className="hover:text-accent">
                Mis favoritos
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cream/50 font-semibold">
            CR Market
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <span className="text-cream/40">Acerca de (próximamente)</span>
            </li>
            <li>
              <span className="text-cream/40">Contacto (próximamente)</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 text-xs text-cream/50">
          © {new Date().getFullYear()} CR Market. Datos curados desde Facebook Marketplace.
        </div>
      </div>
    </footer>
  )
}
