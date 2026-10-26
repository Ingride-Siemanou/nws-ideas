import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key && !url.includes('YOUR_PROJECT'))
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
)
export const allowedDomain = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN as string || 'normandiewebschool.fr')
  .toLowerCase().replace(/^@/, '')
