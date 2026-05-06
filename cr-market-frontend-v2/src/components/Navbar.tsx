import Link from 'next/link'

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur border-b border-soft">
      <nav className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">CR</span>
          <span className="font-serif text-xl font-bold tracking-tight">Market</span>
        </Link>

        <div className="flex items-center gap-8 text-sm">
          <Link href="/listings" className="hover:text-accent transition-colors">
            Propiedades
          </Link>
          <Link href="/nuevos" className="hover:text-accent transition-colors">
            Recién hoy
          </Link>
          <Link href="/favoritos" className="hover:text-accent transition-colors">
            Favoritos
          </Link>
        </div>
      </nav>
    </header>
  )
}
