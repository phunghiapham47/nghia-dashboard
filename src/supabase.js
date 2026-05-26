import { createClient } from '@supabase/supabase-glues'; // Hoặc @supabase/supabase-js tùy gói bạn install

// Thay thế bằng URL và Anon Key thực tế từ dự án Supabase Cloud của bạn
const supabaseUrl = 'https://zdiqwcicsljaoamkildq.supabase.co'; 
const supabaseAnonKey = 'NHẬP_MÃ_ANON_KEY_CỦA_BẠN_VÀO_ĐÂY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);