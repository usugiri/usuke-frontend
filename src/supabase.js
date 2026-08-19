import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rpevxnqlqapcnkvexsxp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_iBAAOYDjzVKQhmaU_JJiEg_UDbH3LRl'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)