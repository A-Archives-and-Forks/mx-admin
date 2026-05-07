import type { Pager } from './base'

export interface EnrichmentImage {
  url: string
  width?: number
  height?: number
  alt?: string
  blurhash?: string
}

export interface EnrichmentAttribute {
  key: string
  value: string | number | boolean
  label?: string
  format?: 'number' | 'rating' | 'date' | 'percent' | 'text' | 'duration'
}

export interface EnrichmentResult {
  title: string
  description?: string
  image?: EnrichmentImage
  url: string
  category: string
  subtype?: string
  publishedAt?: string
  fetchedAt: string
  attributes?: EnrichmentAttribute[]
  color?: string
  links?: Array<{ rel: string; url: string; label?: string }>
}

export interface EnrichmentRow {
  id: string
  provider: string
  externalId: string
  url: string
  /**
   * Cache locale tag. `''` denotes the default / locale-unaware row used by
   * single-language providers and as the fallback row of locale-aware ones.
   * Non-empty values are normalized 2-letter codes (`zh`, `ja`, `ko`, `en`).
   */
  locale: string
  normalized: EnrichmentResult
  raw: unknown | null
  fetchedAt: string
  expiresAt: string | null
  failureCount: number
  lastError: string | null
  createdAt: string
}

export interface EnrichmentListResponse {
  data: EnrichmentRow[]
  pagination: Pager
}

export interface EnrichmentProviderMeta {
  name: string
  displayName: string
  category: string
  /** Section under `thirdPartyServiceIntegration` is enabled (or unscoped). */
  enabled: boolean
  /** Server confirms this provider can resolve right now (enabled + creds). */
  ready: boolean
  /** Required config keys (relative to gate section) that are empty. */
  missingKeys: string[]
  requiredConfigKeys?: string[]
  featureGateConfigKey?: string
  /** Whether this provider fetches per-locale variants (e.g. TMDB). */
  localeAware: boolean
  /** ISO-639-1 codes the provider can localize into (only when localeAware). */
  supportedLocales?: readonly string[]
}
