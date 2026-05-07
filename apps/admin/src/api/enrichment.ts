import type {
  EnrichmentListResponse,
  EnrichmentProviderMeta,
  EnrichmentResult,
} from '~/models/enrichment'

import { request } from '~/utils/request'

const encodeId = (id: string) => encodeURIComponent(id)

export const enrichmentApi = {
  resolve: (url: string, lang?: string) =>
    request.get<EnrichmentResult>('/enrichment/resolve', {
      params: { url, ...(lang ? { lang } : {}) },
    }),

  list: (
    params: {
      page?: number
      size?: number
      onlyFailed?: boolean
      locale?: string
    } = {},
  ) =>
    request.get<EnrichmentListResponse>('/enrichment/admin/list', {
      params: {
        ...params,
        ...(params.onlyFailed ? { onlyFailed: true } : {}),
        ...(params.locale !== undefined ? { locale: params.locale } : {}),
      },
    }),

  providers: () =>
    request.get<EnrichmentProviderMeta[]>('/enrichment/admin/providers'),

  /**
   * Refresh a single cache row. Pass `locale` (the row's locale, or empty for
   * the default row) so the right per-locale row is updated. Omit (or pass
   * empty string) to refresh the default (`''`) row.
   */
  refresh: (provider: string, externalId: string, locale?: string) =>
    request.post<EnrichmentResult>(
      `/enrichment/admin/refresh/${encodeURIComponent(provider)}/${encodeId(externalId)}`,
      {
        params: locale ? { lang: locale } : undefined,
      },
    ),

  /**
   * Drop cache for a (provider, externalId). Without `locale`, every locale
   * variant of the resource is purged — admin "clear cache" semantics.
   */
  invalidate: (provider: string, externalId: string, locale?: string) =>
    request.delete<void>(
      `/enrichment/admin/cache/${encodeURIComponent(provider)}/${encodeId(externalId)}`,
      {
        params: locale !== undefined ? { lang: locale } : undefined,
      },
    ),
}
