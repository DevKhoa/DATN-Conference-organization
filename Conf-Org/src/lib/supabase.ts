import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qcwihjxqmxkwqpezkukz.supabase.co";
const supabaseKey = "sb_publishable_y3HNvbJPvyXJrWkvmJSGhw_thpyIJm5";

export const supabase = createClient(supabaseUrl, supabaseKey);