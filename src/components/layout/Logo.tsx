import { cn } from '@/lib/cn'

/** Foglia stilizzata: la stessa icona usata come favicon e icona PWA. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Benessere"
      className={cn('shrink-0', className)}
    >
      <rect width="64" height="64" rx="14" className="fill-accent-600" />
      <path
        d="M46 18c0 13.3-8.7 22-19.4 22-3 0-5.6-.6-7.8-1.8C20.6 26.4 30 19.2 44 18.2c.7 0 1.4-.1 2-.2Z"
        fill="#fff"
        fillOpacity="0.96"
      />
      <path
        d="M17 47c1.6-6.6 5.4-12.4 10.8-16.6"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
