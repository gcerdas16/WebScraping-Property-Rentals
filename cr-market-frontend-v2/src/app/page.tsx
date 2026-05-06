import { Hero } from '@/components/home/Hero'
import { RecienHoy } from '@/components/home/RecienHoy'
import { Ciudades } from '@/components/home/Ciudades'
import { WhatsAppCTA } from '@/components/home/WhatsAppCTA'

export const revalidate = 300 // ISR: revalidate every 5 min

export default function HomePage() {
  return (
    <>
      <Hero />
      <RecienHoy />
      <Ciudades />
      <WhatsAppCTA />
    </>
  )
}
