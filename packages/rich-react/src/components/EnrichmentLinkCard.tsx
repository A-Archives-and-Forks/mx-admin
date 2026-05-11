import { useEffect, useState } from 'react'
import type { LinkCardRendererProps } from '@haklex/rich-editor/renderers'
import type { CSSProperties, FC, ReactNode } from 'react'
import type { EnrichmentAttribute, EnrichmentResult } from '../types'

import {
  LinkCardRenderer,
  LinkCardSkeleton,
} from '@haklex/rich-renderer-linkcard'

import { useEnrichmentFetcher } from './EnrichmentLinkCardContext'

// ======================== Cache ========================

const cache = new Map<string, EnrichmentResult | null>()
const inflight = new Map<string, Promise<EnrichmentResult | null>>()

function fetchOnce(
  url: string,
  fetcher: (url: string) => Promise<EnrichmentResult | null>,
): Promise<EnrichmentResult | null> {
  if (cache.has(url)) return Promise.resolve(cache.get(url) ?? null)
  let p = inflight.get(url)
  if (p) return p
  p = fetcher(url)
    .then((res) => {
      cache.set(url, res ?? null)
      inflight.delete(url)
      return res ?? null
    })
    .catch(() => {
      cache.set(url, null)
      inflight.delete(url)
      return null
    })
  inflight.set(url, p)
  return p
}

interface EnrichmentState {
  loading: boolean
  data: EnrichmentResult | null
}

function useEnrichment(url: string): EnrichmentState | null {
  const fetcher = useEnrichmentFetcher()
  const initial: EnrichmentState =
    fetcher && url
      ? { loading: !cache.has(url), data: cache.get(url) ?? null }
      : { loading: false, data: null }
  const [state, setState] = useState<EnrichmentState>(initial)

  useEffect(() => {
    if (!fetcher || !url) {
      setState({ loading: false, data: null })
      return
    }
    if (cache.has(url)) {
      setState({ loading: false, data: cache.get(url) ?? null })
      return
    }
    setState({ loading: true, data: null })
    let mounted = true
    fetchOnce(url, fetcher).then((data) => {
      if (mounted) setState({ loading: false, data })
    })
    return () => {
      mounted = false
    }
  }, [fetcher, url])

  if (!fetcher) return null
  return state
}

// ======================== Top-level component ========================

export const EnrichmentLinkCard: FC<LinkCardRendererProps> = (props) => {
  const { url } = props
  const enrichment = useEnrichment(url)

  // No fetcher configured → fall back to the library's default LinkCard.
  if (!enrichment) return <LinkCardRenderer {...props} />

  if (enrichment.loading) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-hide-print
        style={{ textDecoration: 'none' }}
      >
        <LinkCardSkeleton />
      </a>
    )
  }

  if (!enrichment.data) {
    // Cache miss / unsupported URL → keep the library's default behavior so
    // typed plugins (github / tmdb / etc.) still get a chance to render.
    return <LinkCardRenderer {...props} />
  }

  return <CardDispatcher data={enrichment.data} fallbackUrl={url} />
}

// ======================== Dispatch ========================

const CardDispatcher: FC<{ data: EnrichmentResult; fallbackUrl: string }> = ({
  data,
  fallbackUrl,
}) => {
  switch (data.category) {
    case 'github':
      return <GithubCard e={data} />
    case 'media':
      return <MediaCard e={data} />
    case 'book':
      return <BookCard e={data} />
    case 'music':
      return <MusicCard e={data} />
    case 'academic':
      return <AcademicCard e={data} />
    case 'code':
      return <CodeCard e={data} />
    case 'self':
      return <SelfCard e={data} />
    default:
      return <FallbackCard e={data} fallbackUrl={fallbackUrl} />
  }
}

// ======================== Shared utilities ========================

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function formatAttr(a: EnrichmentAttribute): string {
  const v = a.value
  switch (a.format) {
    case 'rating':
      return typeof v === 'number' ? `★ ${v.toFixed(1)}` : `★ ${v}`
    case 'percent':
      return typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : `${v}`
    case 'date':
      return typeof v === 'string'
        ? new Date(v).toLocaleDateString('zh-CN')
        : String(v)
    case 'duration':
      if (typeof v === 'number') {
        const m = Math.floor(v / 60)
        const s = Math.floor(v % 60)
        return `${m}:${s.toString().padStart(2, '0')}`
      }
      return String(v)
    case 'number':
      return typeof v === 'number' ? v.toLocaleString() : String(v)
    default:
      return String(v)
  }
}

const categoryColorFallback: Record<string, string> = {
  github: '#24292f',
  media: '#01b4e4',
  book: '#8b6f4e',
  music: '#c20c0c',
  academic: '#b31b1b',
  code: '#ffa116',
  self: '#3b82f6',
}

function colorFor(e: EnrichmentResult): string {
  return e.color || categoryColorFallback[e.category] || '#737373'
}

// ======================== Inline-style tokens ========================

const cardStyle: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  borderRadius: 8,
  border: '1px solid var(--enrich-border, rgba(115,115,115,0.25))',
  background: 'var(--enrich-bg, rgba(255,255,255,0.6))',
  textDecoration: 'none',
  color: 'inherit',
  margin: '12px 0',
  transition: 'border-color 120ms ease, background-color 120ms ease',
}

const colorBarStyle = (color: string): CSSProperties => ({
  display: 'flex',
  gap: 12,
  padding: '10px 12px',
  borderLeft: `3px solid ${color}`,
})

const imageShellStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  padding: 12,
}

const titleStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.4,
  margin: 0,
}

const descStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--enrich-muted, #737373)',
  margin: '4px 0 0',
}

const footerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  marginTop: 6,
  fontSize: 12,
  color: 'var(--enrich-muted-2, #a3a3a3)',
}

const badgeStyle = (color?: string): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '1px 6px',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 600,
  background: color
    ? `color-mix(in srgb, ${color} 15%, transparent)`
    : 'rgba(115,115,115,0.15)',
  color: color || 'inherit',
  textTransform: 'uppercase',
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
})

// ======================== Shells ========================

const CardShell: FC<{ href?: string; children: ReactNode }> = ({
  href,
  children,
}) => {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-hide-print
        style={cardStyle}
      >
        {children}
      </a>
    )
  }
  return <div style={cardStyle}>{children}</div>
}

const ExternalIcon: FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 3h6v6" />
    <path d="M10 14L21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
)

const LinkFooter: FC<{ url: string; self?: boolean }> = ({ url, self }) => (
  <span style={footerStyle}>
    <ExternalIcon />
    <span
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {self ? pathOf(url) : hostnameOf(url)}
    </span>
  </span>
)

const AttributeRow: FC<{
  attrs?: EnrichmentAttribute[]
  exclude?: string[]
  limit?: number
}> = ({ attrs, exclude = [], limit = 3 }) => {
  const visible = (attrs || [])
    .filter((a) => !exclude.includes(a.key))
    .slice(0, limit)
  if (visible.length === 0) return null
  return (
    <div
      style={{
        marginTop: 4,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0 12px',
        fontSize: 12,
        color: 'var(--enrich-muted, #737373)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {visible.map((a) => (
        <span key={a.key}>
          {a.label ? `${a.label} ` : ''}
          {formatAttr(a)}
        </span>
      ))}
    </div>
  )
}

// ======================== Per-category cards ========================

const GithubCard: FC<{ e: EnrichmentResult }> = ({ e }) => {
  const stateAttr = e.attributes?.find((a) => a.key === 'state')
  const stateColors: Record<string, string> = {
    OPEN: '#238636',
    CLOSED: '#f85149',
    MERGED: '#8957e5',
  }
  const stateValue = String(stateAttr?.value ?? '').toUpperCase()
  const subtypeLabel = e.subtype ? e.subtype.toUpperCase() : 'REPO'
  return (
    <CardShell href={e.url}>
      <div style={colorBarStyle(colorFor(e))}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            {stateAttr ? (
              <span style={badgeStyle(stateColors[stateValue])}>
                {stateValue}
              </span>
            ) : (
              <span style={badgeStyle()}>{subtypeLabel}</span>
            )}
            <h4 style={{ ...titleStyle, fontFamily: 'monospace' }}>
              {e.title}
            </h4>
          </div>
          {e.description && <p style={descStyle}>{e.description}</p>}
          <AttributeRow attrs={e.attributes} exclude={['state']} limit={4} />
          <LinkFooter url={e.url} />
        </div>
      </div>
    </CardShell>
  )
}

const MediaCard: FC<{ e: EnrichmentResult }> = ({ e }) => (
  <CardShell href={e.url}>
    <div style={imageShellStyle}>
      {e.image && (
        <img
          src={e.image.url}
          alt={e.image.alt || e.title}
          loading="lazy"
          style={{
            width: 80,
            height: 120,
            flexShrink: 0,
            borderRadius: 4,
            objectFit: 'cover',
          }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <h4 style={titleStyle}>{e.title}</h4>
        {e.description && <p style={descStyle}>{e.description}</p>}
        <AttributeRow attrs={e.attributes} limit={4} />
        <LinkFooter url={e.url} />
      </div>
    </div>
  </CardShell>
)

const BookCard: FC<{ e: EnrichmentResult }> = ({ e }) => (
  <CardShell href={e.url}>
    <div style={imageShellStyle}>
      {e.image && (
        <img
          src={e.image.url}
          alt={e.image.alt || e.title}
          loading="lazy"
          style={{
            width: 60,
            height: 80,
            flexShrink: 0,
            borderRadius: 4,
            objectFit: 'cover',
          }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <h4 style={titleStyle}>{e.title}</h4>
        <AttributeRow attrs={e.attributes} limit={4} />
        <LinkFooter url={e.url} />
      </div>
    </div>
  </CardShell>
)

const MusicCard: FC<{ e: EnrichmentResult }> = ({ e }) => (
  <CardShell href={e.url}>
    <div style={imageShellStyle}>
      {e.image && (
        <img
          src={e.image.url}
          alt={e.image.alt || e.title}
          loading="lazy"
          style={{
            width: 72,
            height: 72,
            flexShrink: 0,
            borderRadius: 4,
            objectFit: 'cover',
          }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--enrich-muted, #737373)' }}>▶</span>
          <h4 style={titleStyle}>{e.title}</h4>
        </div>
        <AttributeRow attrs={e.attributes} limit={3} />
        <LinkFooter url={e.url} />
      </div>
    </div>
  </CardShell>
)

const AcademicCard: FC<{ e: EnrichmentResult }> = ({ e }) => {
  const arxivId = e.attributes?.find((a) => a.key === 'arxivId')
  return (
    <CardShell href={e.url}>
      <div style={colorBarStyle(colorFor(e))}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--enrich-muted, #737373)' }}>📄</span>
            {arxivId && (
              <span style={badgeStyle('#b31b1b')}>arXiv:{arxivId.value}</span>
            )}
          </div>
          <h4 style={{ ...titleStyle, marginTop: 4 }}>{e.title}</h4>
          <AttributeRow attrs={e.attributes} exclude={['arxivId']} limit={2} />
          {e.description && <p style={descStyle}>{e.description}</p>}
          <LinkFooter url={e.url} />
        </div>
      </div>
    </CardShell>
  )
}

const CodeCard: FC<{ e: EnrichmentResult }> = ({ e }) => {
  const difficulty = e.attributes?.find((a) => a.key === 'difficulty')
  const number = e.attributes?.find((a) => a.key === 'number')
  const tags = e.attributes?.find((a) => a.key === 'tags')
  const diffColors: Record<string, string> = {
    easy: '#00bfa5',
    medium: '#ffa726',
    hard: '#f44336',
  }
  const d = String(difficulty?.value ?? '').toLowerCase()
  return (
    <CardShell href={e.url}>
      <div style={colorBarStyle(colorFor(e))}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            {number && <span style={badgeStyle()}>#{number.value}</span>}
            {difficulty && (
              <span style={badgeStyle(diffColors[d])}>
                {String(difficulty.value)}
              </span>
            )}
            <h4 style={{ ...titleStyle, fontFamily: 'monospace' }}>
              {e.title}
            </h4>
          </div>
          {tags && typeof tags.value === 'string' && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: 'var(--enrich-muted, #737373)',
              }}
            >
              {tags.value}
            </div>
          )}
          <AttributeRow
            attrs={e.attributes}
            exclude={['difficulty', 'number', 'tags']}
            limit={3}
          />
          <LinkFooter url={e.url} />
        </div>
      </div>
    </CardShell>
  )
}

const SelfCard: FC<{ e: EnrichmentResult }> = ({ e }) => {
  const subtypeLabel: Record<string, string> = {
    post: '博文',
    note: '手记',
    page: '页面',
  }
  const label = e.subtype ? subtypeLabel[e.subtype] || e.subtype : ''
  return (
    <CardShell href={e.url}>
      <div style={colorBarStyle(colorFor(e))}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'var(--enrich-muted, #737373)' }}>📝</span>
            {label && <span style={badgeStyle('#3b82f6')}>{label}</span>}
            <h4 style={titleStyle}>{e.title}</h4>
          </div>
          {e.description && <p style={descStyle}>{e.description}</p>}
          <AttributeRow attrs={e.attributes} limit={3} />
          <LinkFooter url={e.url} self />
        </div>
      </div>
    </CardShell>
  )
}

const FallbackCard: FC<{ e: EnrichmentResult; fallbackUrl: string }> = ({
  e,
  fallbackUrl,
}) => (
  <CardShell href={e.url || fallbackUrl}>
    <div style={imageShellStyle}>
      {e.image && (
        <img
          src={e.image.url}
          alt={e.image.alt || e.title}
          loading="lazy"
          style={{
            width: 80,
            height: 80,
            flexShrink: 0,
            borderRadius: 4,
            objectFit: 'cover',
          }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <h4 style={titleStyle}>{e.title}</h4>
        <div
          style={{
            marginTop: 2,
            fontSize: 12,
            color: 'var(--enrich-muted-2, #a3a3a3)',
          }}
        >
          {e.category}
          {e.subtype ? ` · ${e.subtype}` : ''}
        </div>
        <AttributeRow attrs={e.attributes} limit={3} />
        <LinkFooter url={e.url || fallbackUrl} />
      </div>
    </div>
  </CardShell>
)
