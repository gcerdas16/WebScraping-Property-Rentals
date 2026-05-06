import { WHATSAPP_CHANNEL_URL } from '@/lib/config'

export function WhatsAppCTA() {
  return (
    <section className="bg-ink text-cream">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-accent">
            Canal de WhatsApp
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mt-3 leading-tight">
            Recibí lo nuevo apenas se lista, sin abrir esta página.
          </h2>
        </div>

        <div className="md:justify-self-end">
          <p className="text-sm text-cream/70 max-w-md mb-6 leading-relaxed">
            Posteo manualmente las propiedades nuevas al canal cada día. Sin spam, sin alertas que
            llegan tarde — solo lo que vale la pena ver.
          </p>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex bg-accent text-ink px-8 py-4 text-base font-bold tracking-wide hover:bg-accent/90 transition-colors"
          >
            Unirme al canal →
          </a>
        </div>
      </div>
    </section>
  )
}
