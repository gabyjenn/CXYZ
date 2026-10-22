export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'placeholder'
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const apiVersion = '2025-10-01'
export const isConfigured = projectId !== 'placeholder'
