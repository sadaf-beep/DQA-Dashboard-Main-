const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://jwxkgdwegwxlqddybszp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bsujv14yj35PMMC-Lz5V-A_DLBWTIbs';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: users } = await supabase.from('users').select('id');
  const userIds = new Set(users.map(u => u.id));

  const { data: tasks } = await supabase.from('tasks').select('*');
  const danglingTasks = tasks.filter(t => {
    let assignees = [t.assignee_id].filter(Boolean);
    if (t.tags && t.tags.length > 0) {
      try {
        const p = JSON.parse(t.tags[0]);
        if (p.assigneeIds) assignees = p.assigneeIds;
      } catch (e) {}
    }
    return assignees.length > 0 && !userIds.has(assignees[0]);
  });

  console.log("Tasks with deleted users:", danglingTasks.length);
  if (danglingTasks.length > 0) {
      console.log("Example:", danglingTasks[0]);
  }
}
check();
