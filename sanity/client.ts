import { createClient } from 'next-sanity'
import { createImageUrlBuilder } from '@sanity/image-url'
import { apiVersion, dataset, isConfigured, projectId } from './env'

export const client = createClient({ projectId, dataset, apiVersion, useCdn: true })

const builder = createImageUrlBuilder({ projectId, dataset })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const urlFor = (source: any) => builder.image(source).auto('format')

/**
 * Fetch with ISR. Content updates appear within `revalidate` seconds.
 * Returns `fallback` instead of crashing when Sanity isn't configured yet.
 */
export async function sanityFetch<T>(query: string, fallback: T, revalidate = 60): Promise<T> {
  if (!isConfigured) return fallback
  try {
    const data = await client.fetch<T>(query, {}, { next: { revalidate } })
    return data ?? fallback
  } catch (err) {
    console.error('[sanity] fetch failed', err)
    return fallback
  }
}
