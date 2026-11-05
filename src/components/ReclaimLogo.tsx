import { useId, useState } from 'react'

type ReclaimMarkProps = {
  size?: number
  interactive?: boolean
  className?: string
  tone?: 'auto' | 'ink'
}

type ReclaimWordmarkProps = {
  interactive?: boolean
  className?: string
}

type ReclaimLogoProps = ReclaimMarkProps & {
  variant?: 'mark' | 'full'
}

/**
 * The icon is intentionally independent from the wordmark. That lets the
 * future navbar collapse from “Reclaim.” into only the R without changing
 * the identity or its interaction model.
 */
/** Geometry shared with the static copies (favicon, landing sprite): scripts/reclaim-mark.py writes those. */
const MARK_VIEWBOX = '7 7 106 98'
/** The R cut through the top slab, drawn on that slab's isometric face. */
const MARK_R = 'M29 80V22h22a15.5 15.5 0 0 1 0 31H29m20 0 22 27'
const MARK_FACE = 'M10 35 60 10l50 25-50 25Z'
const MARK_BANDS = ['M10 45 60 70l50-25v4L60 74 10 49Z', 'M10 59 60 84l50-25v4L60 88 10 63Z', 'M10 73 60 98l50-25v4L60 102 10 77Z']
const MARK_GREEN = '#00E487'

/**
 * Reclaim's mark: three stacked ledger slabs with the R cut through the top one and the
 * recovered layer in green. The ink layers follow currentColor, so it reads on light and dark.
 * With `splash`, hovering the nearest link or button floods it green from the bottom up.
 */
export function MarkGraphic({ className, size, ink = 'currentColor', splash = false }: { className?: string; size?: number; ink?: string; splash?: boolean }) {
  const mask = `rm${useId().replace(/:/g, '')}`
  const layers = (inkFill: string, greenFill: string) => [MARK_FACE, ...MARK_BANDS].map((d, i) => {
    const fill = i === 2 ? greenFill : inkFill
    return <path key={d} d={d} fill={fill} stroke={fill} />
  })
  return (
    <svg aria-hidden="true" className={className} width={size} height={size} viewBox={MARK_VIEWBOX} fill="none">
      <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
        <rect width="120" height="120" fill="#fff" />
        <path transform="matrix(.5 -.25 .5 .25 10 35)" d={MARK_R} fill="none" stroke="#000" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
      </mask>
      <g strokeWidth="5" strokeLinejoin="round" mask={`url(#${mask})`}>
        {layers(ink, MARK_GREEN)}
        {splash ? <g className="reclaim-mark-splash">{layers('var(--reclaim-splash, #00fd74)', 'var(--reclaim-splash, #00fd74)')}</g> : null}
      </g>
    </svg>
  )
}

export function ReclaimMark({ size = 40, interactive = false, className = '', tone = 'auto' }: ReclaimMarkProps) {
  const [isActive, setIsActive] = useState(false)

  return (
    <span
      className={`inline-flex ${className}`}
      data-active={isActive}
      onMouseEnter={interactive ? () => setIsActive(true) : undefined}
      onMouseLeave={interactive ? () => setIsActive(false) : undefined}
    >
      <MarkGraphic className="reclaim-mark" size={size} ink={tone === 'ink' ? '#171717' : 'currentColor'} splash />
    </span>
  )
}

export function ReclaimWordmark({ interactive = false, className = '' }: ReclaimWordmarkProps) {
  const [isActive, setIsActive] = useState(false)

  return (
    <span
      className={`reclaim-wordmark text-[1.35rem] font-semibold leading-none tracking-[-0.055em] ${className}`}
      data-active={isActive}
      onMouseEnter={interactive ? () => setIsActive(true) : undefined}
      onMouseLeave={interactive ? () => setIsActive(false) : undefined}
    >
      Reclaim<span className="reclaim-wordmark-period">.</span>
    </span>
  )
}

export function ReclaimLogo({ variant = 'full', size = 40, interactive = false, className = '', tone = 'auto' }: ReclaimLogoProps) {
  if (variant === 'mark') return <ReclaimMark size={size} interactive={interactive} className={className} tone={tone} />

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <ReclaimMark size={size} interactive={interactive} tone={tone} />
      <ReclaimWordmark interactive={interactive} />
    </span>
  )
}
