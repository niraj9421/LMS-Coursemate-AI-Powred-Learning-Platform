import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

const quickLinks = [
  { label: 'Courses', href: '/courses' },
  { label: 'Community', href: '/dashboard/community' },
  { label: 'Placement Hub', href: '/dashboard/placement' },
  { label: 'About', href: '/about' },
  { label: 'Privacy Policy', href: '/privacy' },
]

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com', icon: '🐙' },
  { label: 'Twitter', href: 'https://twitter.com', icon: '🐦' },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: '💼' },
  { label: 'YouTube', href: 'https://youtube.com', icon: '▶️' },
]

/**
 * Task 18.11 — Footer with quick links, social icons, newsletter subscription.
 */
export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubscribed(true)
      setEmail('')
    }
  }

  return (
    <footer className="border-t border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link to="/">
              <Logo size={36} showText />
            </Link>
            <p className="mt-3 text-sm text-gray-400 max-w-xs">
              AI-powered learning platform to accelerate your career with courses, placement prep, and community.
            </p>
            <div className="mt-4 flex gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Stay Updated</h3>
            <p className="text-sm text-gray-400 mb-3">Get the latest courses and tech news in your inbox.</p>
            {subscribed ? (
              <p className="text-sm text-green-400 font-medium">✓ You're subscribed!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  aria-label="Email for newsletter"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} LMS CourseMate. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
