import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjaqtywgeqcxyydpuhzx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qYXF0eXdnZXFjeHl5ZHB1aHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjI3MTksImV4cCI6MjA1NDE5ODcxOX0.USEGNaVKkNmv_uYABF6Zsv8D0Yb7p75MI9jiaMtdwIM';

export const supabase = createClient(supabaseUrl, supabaseKey);
