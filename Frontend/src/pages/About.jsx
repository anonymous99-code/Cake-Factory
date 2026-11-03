import { Link } from 'react-router-dom'
import { ChefHat, Heart, PartyPopper, Sparkles } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

export default function About() {
  const { settings } = useSettings()
  const story = settings.about_text?.trim()

  return (
    <div className="container-page max-w-4xl py-12">
      <p className="text-sm font-semibold uppercase tracking-wider text-berry-500">About us</p>
      <h1 className="section-title mt-1">{settings.business_name}</h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed text-cocoa-600">
        {story ? (
          story.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)
        ) : (
          <>
            <p>{settings.business_name} is a food business that prepares fresh snacks every day, takes advance orders, and caters for events of every size.</p>
            <p>We sell what we have made until it is finished, so what you get is always fresh. For bigger occasions, we plan the menu with you and send a quotation that fits your event.</p>
          </>
        )}
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {[
          [Sparkles, 'Fresh', 'Made in small batches and sold until it runs out.'],
          [Heart, 'Personal', 'We talk to you, understand the occasion, and quote fairly.'],
          [PartyPopper, 'For every occasion', 'Everyday snacks, birthdays, weddings and corporate events.'],
        ].map(([I, t, d]) => (
          <div key={t} className="card">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-berry-50 text-berry-600"><I className="h-6 w-6" /></span>
            <h3 className="mt-4 text-lg font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-cocoa-500">{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/menu" className="btn btn-primary">See the menu</Link>
        <Link to="/catering" className="btn btn-secondary"><ChefHat className="h-4 w-4" /> Catering inquiry</Link>
      </div>
    </div>
  )
}
