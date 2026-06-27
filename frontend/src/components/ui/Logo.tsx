interface LogoProps {
  size?: number
  className?: string
  showText?: boolean
  variant?: 'auto' | 'dark' | 'light'
}

export function Logo({ size = 32, className = '', showText = true, variant = 'auto' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="CourseMate logo"
      >
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="lg2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* Outer ring */}
        <circle cx="20" cy="20" r="19" fill="url(#lg1)" />

        {/* Mortarboard diamond top */}
        <polygon points="20,7 33,14 20,21 7,14" fill="white" opacity="0.95" />

        {/* Tassel */}
        <line x1="33" y1="14" x2="33" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <circle cx="33" cy="23" r="1.5" fill="white" opacity="0.9" />

        {/* Cap body */}
        <rect x="13" y="20" width="14" height="8" rx="2" fill="white" opacity="0.85" />

        {/* Stage */}
        <rect x="10" y="29" width="20" height="3" rx="1.5" fill="white" opacity="0.6" />

        {/* Center dot */}
        <circle cx="20" cy="17" r="1.2" fill="url(#lg1)" />
      </svg>

      {showText && (
        <span className="font-bold text-lg leading-tight">
          <span className={variant === 'light' ? 'text-primary-600' : variant === 'dark' ? 'text-white' : 'text-primary-600 dark:text-white'}>
            Course
          </span>
          <span className={variant === 'light' ? 'text-text' : variant === 'dark' ? 'text-white/90' : 'text-text dark:text-white/90'}>
            Mate
          </span>
        </span>
      )}
    </div>
  )
}
