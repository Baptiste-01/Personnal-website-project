import { useRef, useState } from 'react'
import './Slider.css'

/* ─── Types ─── */
export interface SlideItem {
  id: string
  title: string
  description: string
  /** Optional image URL */
  image?: string
  /** Badge / tag label */
  tag?: string
  tagColor?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  /** Accent color for the top border stripe */
  accentColor?: string
  /** Optional CTA button */
  cta?: {
    label: string
    onClick: () => void
  }
}

export interface SliderProps {
  /** Slides data */
  slides: SlideItem[]
  /**
   * Width of each card in px (default: 200)
   */
  cardWidth?: number
  /** Card height in px (default: 110) */
  cardHeight?: number
  /** Gap between cards in px (default: 12) */
  gap?: number
  /**
   * Scroll speed: total duration in seconds for one full loop (default: 30).
   * Lower = faster.
   */
  duration?: number
  /** Additional CSS class */
  className?: string
}

/* ─── Tag color classes ─── */
const TAG_CLASS: Record<string, string> = {
  blue:   'sc-tag--blue',
  green:  'sc-tag--green',
  orange: 'sc-tag--orange',
  red:    'sc-tag--red',
  purple: 'sc-tag--purple',
}

const ACCENT_BORDER: Record<string, string> = {
  blue:   '#3b82f6',
  green:  '#22c55e',
  orange: '#f59e0b',
  red:    '#ef4444',
  purple: '#a855f7',
}

/* ─── Component ─── */
export default function Slider({
  slides,
  cardWidth = 200,
  cardHeight = 110,
  gap = 12,
  duration = 30,
  className = '',
}: SliderProps) {
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // Duplicate slides to create seamless loop
  // We use 4× copies so the loop is never "empty"
  const loopedSlides = [...slides, ...slides, ...slides, ...slides]

  // Total width of one set = cards + gaps
  const setWidth = slides.length * (cardWidth + gap)

  return (
    <div
      className={`sc-wrapper ${className}`}
      id="slider-component"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Fade masks left & right */}
      <div className="sc-fade sc-fade--left"  aria-hidden="true" />
      <div className="sc-fade sc-fade--right" aria-hidden="true" />

      {/* ── Scrolling track ── */}
      <div className="sc-track-outer" id="slider-track-outer">
        <div
          ref={trackRef}
          className="sc-track"
          id="slider-track"
          style={{
            /* The animation moves exactly one full set width, creating the loop */
            animationDuration: `${duration}s`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {loopedSlides.map((slide, i) => {
            const borderColor =
              slide.accentColor ??
              ACCENT_BORDER[slide.tagColor ?? 'blue'] ??
              '#3b82f6'

            return (
              <div
                key={`${slide.id}-${i}`}
                className="sc-card"
                style={{
                  width: cardWidth,
                  minWidth: cardWidth,
                  height: cardHeight,
                  borderTopColor: borderColor,
                  marginRight: gap,
                }}
              >
                {slide.tag && (
                  <span className={`sc-tag ${TAG_CLASS[slide.tagColor ?? 'blue']}`}>
                    {slide.tag}
                  </span>
                )}
                <h3 className="sc-title">{slide.title}</h3>
                <p className="sc-desc">{slide.description}</p>
                {slide.cta && (
                  <button
                    className="sc-cta"
                    onClick={slide.cta.onClick}
                    id={`slide-cta-${slide.id}-${i}`}
                  >
                    {slide.cta.label}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Hidden: store setWidth so CSS can use it via inline var */}
      <style>{`
        #slider-track {
          --sc-set-width: ${setWidth}px;
        }
      `}</style>
    </div>
  )
}
