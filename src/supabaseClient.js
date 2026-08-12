import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Aviso amigável em desenvolvimento — evita uma tela em branco confusa
  // se o arquivo .env não tiver sido configurado ainda.
  console.warn(
    'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env (veja .env.example).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)