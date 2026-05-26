import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zdiqwcicsljaoamkildq.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkaXF3Y2ljc2xqYW9hbWtpbGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NzgyMTIsImV4cCI6MjA5NTM1NDIxMn0.C6uhg4_5KVIqy_yMU8uvCji7efzw_L5I3CXN400XDZQ'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);