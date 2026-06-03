const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://jwxkgdwegwxlqddybszp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bsujv14yj35PMMC-Lz5V-A_DLBWTIbs';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('tasks').delete().eq('id', 'non-existent');
  console.log("Delete Error:", error, "Data:", data);
}
run();
