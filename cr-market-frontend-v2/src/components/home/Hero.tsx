import { getActiveListingsCount } from '@/lib/queries'
import { WHATSAPP_CHANNEL_URL } from '@/lib/config'

export async function Hero() {
  const count = await getActiveListingsCount()

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-7 pb-5">
        <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-ink mb-2">
          CR Market
        </div>

        <h1 className="font-display text-[80px] md:text-[110px] leading-[0.85] tracking-mega text-ink">
          {count}
          <span className="text-accent">.</span>
        </h1>

        <div className="font-display italic text-xl md:text-[22px] mt-1 leading-[1.05] text-ink">
          propiedades escogidas en Costa Rica.
        </div>

        <p className="mt-3.5 max-w-[520px] text-[13px] leading-[1.55] text-muted">
          En colones, bien filtradas. Lo nuevo te llega al WhatsApp — no tenés que pasar horas en
          Facebook.
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <a
            href="/listings"
            className="bg-ink text-cream px-[26px] py-[13px] text-[13px] font-semibold tracking-wide hover:bg-muted transition-colors"
          >
            Ver propiedades →
          </a>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent text-ink px-[26px] py-[13px] text-[13px] font-bold tracking-wide hover:bg-accent/90 transition-colors"
          >
            Canal WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}
