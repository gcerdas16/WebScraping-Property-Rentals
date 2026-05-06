import { getActiveListingsCount } from '@/lib/queries'
import { WHATSAPP_CHANNEL_URL } from '@/lib/config'

export async function Hero() {
  const count = await getActiveListingsCount()

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="text-[10px] md:text-[11px] tracking-[0.4em] uppercase font-bold text-ink mb-3">
          CR Market
        </div>

        <h1 className="font-display text-[100px] md:text-[170px] leading-[0.85] tracking-mega text-ink">
          {count}
          <span className="text-accent">.</span>
        </h1>

        <div className="font-display italic text-2xl md:text-[28px] mt-2 leading-tight text-ink">
          propiedades curadas en Costa Rica.
        </div>

        <p className="mt-6 max-w-xl text-sm md:text-base leading-relaxed text-muted">
          Sin scroll infinito en Facebook. Sin calculadora para convertir dólares. Sin estafadores.
          Solo casas y apartamentos en alquiler — recién listados primero.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/listings"
            className="bg-ink text-cream px-7 py-3.5 text-sm font-semibold tracking-wide hover:bg-muted transition-colors"
          >
            Ver propiedades →
          </a>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent text-ink px-7 py-3.5 text-sm font-bold tracking-wide hover:bg-accent/90 transition-colors"
          >
            Canal WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}
