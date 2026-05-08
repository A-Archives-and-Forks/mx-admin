import {
  enhancedEditRendererConfig,
  enhancedRendererConfig,
} from '@haklex/rich-kit-shiro'

import { EnrichmentLinkCard } from './EnrichmentLinkCard'

// Globally route the LinkCard slot through our enrichment-aware renderer.
// `EnrichmentLinkCard` falls back to the library's default LinkCardRenderer
// when no fetcher is wired up, so this is safe to apply at module load.
let patched = false

export function patchLinkCardWithEnrichment(): void {
  if (patched) return
  patched = true
  ;(enhancedEditRendererConfig as { LinkCard?: unknown }).LinkCard =
    EnrichmentLinkCard
  ;(enhancedRendererConfig as { LinkCard?: unknown }).LinkCard =
    EnrichmentLinkCard
}

patchLinkCardWithEnrichment()
