const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://jwxkgdwegwxlqddybszp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bsujv14yj35PMMC-Lz5V-A_DLBWTIbs';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const mapTaskFromDB = (row) => {
  let assigneeIds = [row.assignee_id].filter(Boolean);
  let customType = undefined;
  let hiddenFromBoard = false;

  if (row.tags && row.tags.length > 0) {
    try {
      const parsed = JSON.parse(row.tags[0]);
      if (parsed.assigneeIds) assigneeIds = parsed.assigneeIds;
      if (parsed.customType) customType = parsed.customType;
      // THE BUG IS HERE?
      if (parsed.hiddenFromBoard) hiddenFromBoard = parsed.hiddenFromBoard;
    } catch (e) {
      // Not a JSON string, ignore
    }
  }

  return {
    id: row.id,
    hiddenFromBoard: hiddenFromBoard || row.hidden_from_board // Support legacy column if it exists
  };
};

async function check() {
  const { data: tasks } = await supabase.from('tasks').select('*').limit(5);
  tasks.forEach(t => {
      console.log("DB row hidden_from_board:", t.hidden_from_board);
      console.log("DB tags:", t.tags);
      console.log("Mapped:", mapTaskFromDB(t));
  });
}
check();
