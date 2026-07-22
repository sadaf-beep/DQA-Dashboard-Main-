
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Task, InventoryFile, User, InventoryItem, Invoice, Escalation, UserRole, TaskStatus, TaskPriority, TaskType, LeaveRequest } from '../types';
import { MOCK_USERS } from '../constants';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://jwxkgdwegwxlqddybszp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bsujv14yj35PMMC-Lz5V-A_DLBWTIbs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Supabase Storage bucket for invoice PDFs/CSVs - see
// supabase/invoice_storage_setup.sql for the bucket + access policies.
const INVOICE_BUCKET = 'invoice-files';

// --- HELPER MAPPERS (DB <-> App) ---

// Rows read through `users_safe` (see supabase/security_hardening.sql) never
// include a password column at all - it's not readable by the anon key.
// Password verification happens server-side in the verify-login edge
// function, so `password` here is only ever populated transiently right
// after a write we just made ourselves (e.g. saveUser), never from a read.
const mapUserFromDB = (row: any): User => ({
  id: row.id,
  username: row.username,
  name: row.name,
  role: row.role as UserRole,
  email: row.email,
  avatar: row.avatar,
  phone: row.phone,
  address: row.address,
  country: row.country,
  joiningDate: row.joining_date,
  payRate: row.pay_rate,
  password: row.password
});

const mapUserToDB = (user: User) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  role: user.role,
  email: user.email,
  avatar: user.avatar,
  phone: user.phone,
  address: user.address,
  country: user.country,
  joining_date: user.joiningDate,
  pay_rate: user.payRate,
  password: user.password
});

const mapTaskFromDB = (row: any): Task => {
  let assigneeIds = [row.assignee_id].filter(Boolean);
  let customType = undefined;
  let hiddenFromBoard = false;
  let inventoryItemIds = row.inventory_item_ids;
  let inventoryFileId = row.inventory_file_id;

  if (row.tags && row.tags.length > 0) {
    try {
      const parsed = JSON.parse(row.tags[0]);
      if (parsed.assigneeIds) assigneeIds = parsed.assigneeIds;
      if (parsed.customType) customType = parsed.customType;
      if (parsed.hiddenFromBoard) hiddenFromBoard = parsed.hiddenFromBoard;
      if (parsed.inventoryItemIds) inventoryItemIds = parsed.inventoryItemIds;
      if (parsed.inventoryFileId) inventoryFileId = parsed.inventoryFileId;
    } catch (e) {
      // Not a JSON string, ignore
    }
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeIds,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    type: row.type as TaskType,
    customType,
    dueDate: row.due_date,
    createdAt: Number(row.created_at),
    completedAt: row.completed_at ? Number(row.completed_at) : undefined,
    notes: row.notes || [],
    attachments: row.attachments || [],
    inventoryFileId: inventoryFileId,
    inventoryItemIds: inventoryItemIds,
    isEscalated: row.is_escalated,
    hiddenFromBoard: hiddenFromBoard || row.hidden_from_board // Support legacy column if it exists
  };
};

const mapTaskToDB = (task: Task) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  assignee_id: (task.assigneeIds && task.assigneeIds[0]) || null, // Keep for backwards compatibility if needed
  tags: [JSON.stringify({ 
    assigneeIds: task.assigneeIds || [], 
    customType: task.customType, 
    hiddenFromBoard: task.hiddenFromBoard,
    inventoryItemIds: task.inventoryItemIds,
    inventoryFileId: task.inventoryFileId
  })],
  status: task.status,
  priority: task.priority,
  type: task.type,
  due_date: task.dueDate,
  created_at: task.createdAt,
  completed_at: task.completedAt,
  notes: task.notes,
  attachments: task.attachments,
  inventory_file_id: task.inventoryFileId,
  inventory_item_ids: task.inventoryItemIds,
  is_escalated: task.isEscalated
});

const mapInventoryFromDB = (row: any): InventoryFile => ({
  id: row.id,
  fileName: row.file_name,
  uploadDate: Number(row.upload_date),
  rowCount: row.row_count,
  data: row.data || []
});

const mapInventoryToDB = (file: InventoryFile) => ({
  id: file.id,
  file_name: file.fileName,
  upload_date: file.uploadDate,
  row_count: file.rowCount,
  data: file.data // Sending the whole JSON blob
});

const mapInvoiceFromDB = (row: any): Invoice => ({
  id: row.id,
  referenceName: row.reference_name,
  status: row.status,
  assigneeId: row.assignee_id,
  startDate: row.start_date,
  dueDate: row.due_date,
  isPreProcessed: row.is_pre_processed,
  pdfFile: row.pdf_file,
  csvFile: row.csv_file,
  finalCsvFile: row.final_csv_file,
  createdAt: Number(row.created_at),
  completedAt: row.completed_at ? Number(row.completed_at) : undefined
});

const mapInvoiceToDB = (inv: Invoice) => ({
  id: inv.id,
  reference_name: inv.referenceName,
  status: inv.status,
  assignee_id: inv.assigneeId,
  start_date: inv.startDate,
  due_date: inv.dueDate,
  is_pre_processed: inv.isPreProcessed,
  pdf_file: inv.pdfFile,
  csv_file: inv.csvFile,
  final_csv_file: inv.finalCsvFile,
  created_at: inv.createdAt,
  completed_at: inv.completedAt
});

const mapEscalationFromDB = (row: any): Escalation => ({
  id: row.id,
  taskId: row.task_id,
  taskTitle: row.task_title,
  agentId: row.agent_id,
  agentName: row.agent_name,
  link: row.link,
  history: row.history || [],
  status: row.status,
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at)
});

const mapEscalationToDB = (esc: Escalation) => ({
  id: esc.id,
  task_id: esc.taskId,
  task_title: esc.taskTitle,
  agent_id: esc.agentId,
  agent_name: esc.agentName,
  link: esc.link,
  history: esc.history,
  status: esc.status,
  created_at: esc.createdAt,
  updated_at: esc.updatedAt
});

const mapLeaveRequestFromDB = (row: any): LeaveRequest => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  type: row.type,
  reason: row.reason,
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status,
  createdAt: Number(row.created_at),
  daysRequested: row.days_requested
});

const mapLeaveRequestToDB = (req: LeaveRequest) => ({
  id: req.id,
  user_id: req.userId,
  user_name: req.userName,
  type: req.type,
  reason: req.reason,
  start_date: req.startDate,
  end_date: req.endDate,
  status: req.status,
  created_at: req.createdAt,
  days_requested: req.daysRequested
});

// --- SERVICE IMPLEMENTATION ---

// Simple event bus for connection status
let connectionStatusCallback: ((status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => void) | null = null;
const updateConnectionStatus = (status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => {
  if (connectionStatusCallback) connectionStatusCallback(status);
};

const setupChannelListeners = (channel: RealtimeChannel) => {
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') updateConnectionStatus('CONNECTED');
        if (status === 'CLOSED') updateConnectionStatus('DISCONNECTED');
        if (status === 'CHANNEL_ERROR') updateConnectionStatus('DISCONNECTED');
    });
};

// Keeps a local cache in sync with a table via realtime, applying each
// change directly from the payload instead of re-fetching the whole table
// on every insert/update/delete. `users` doesn't use this - see
// subscribeUsers for why.
const subscribeCollection = <T extends { id: string }>(
  table: string,
  mapFromDB: (row: any) => T,
  callback: (items: T[]) => void
): (() => void) => {
  let cache: T[] = [];

  supabase.from(table).select('*').then(({ data, error }) => {
    if (error) {
      console.error(`Supabase Error (${table}):`, error);
      callback([]);
      return;
    }
    cache = (data || []).map(mapFromDB);
    callback(cache);
  });

  const channel = supabase.channel(`${table}-change`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      if (payload.eventType === 'DELETE') {
        const deletedId = (payload.old as any)?.id;
        if (deletedId == null) return;
        cache = cache.filter(item => item.id !== deletedId);
      } else {
        const updated = mapFromDB(payload.new);
        const idx = cache.findIndex(item => item.id === updated.id);
        cache = idx >= 0
          ? [...cache.slice(0, idx), updated, ...cache.slice(idx + 1)]
          : [updated, ...cache];
      }
      callback(cache);
    });

  setupChannelListeners(channel);
  return () => { supabase.removeChannel(channel); };
};

export const storageService = {
  // --- CONNECTION MONITORING ---
  onConnectionChange: (callback: (status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => void) => {
     connectionStatusCallback = callback;
  },

  // --- SESSION (Local Storage only) ---
  getUserSession: (): User | null => {
    try {
      const storedLocal = localStorage.getItem('dq_user_session');
      if (storedLocal) return JSON.parse(storedLocal);
      
      const storedSession = sessionStorage.getItem('dq_user_session');
      if (storedSession) return JSON.parse(storedSession);
      
      return null;
    } catch { return null; }
  },

  setUserSession: (user: User, remember: boolean = true) => {
    localStorage.removeItem('dq_user_session');
    sessionStorage.removeItem('dq_user_session');
    const data = JSON.stringify(user);
    if (remember) localStorage.setItem('dq_user_session', data);
    else sessionStorage.setItem('dq_user_session', data);
  },

  clearUserSession: () => {
    localStorage.removeItem('dq_user_session');
    sessionStorage.removeItem('dq_user_session');
  },

  // --- USERS ---
  // Doesn't use subscribeCollection: on change, we deliberately re-fetch just
  // the one changed row through users_safe rather than trusting the
  // realtime payload directly. Realtime replicates from the WAL and isn't
  // guaranteed to respect the column-level REVOKE on `password` the same
  // way REST reads are, so payload.new could in principle still carry it.
  // A single fetch-by-id (indexed, cheap) is still far less than
  // re-fetching the whole table on every change.
  subscribeUsers: (callback: (users: User[]) => void) => {
    let cache: User[] = [];

    // Reads go through users_safe (no password column) - see
    // supabase/security_hardening.sql. Writes below still target the base
    // `users` table.
    supabase.from('users_safe').select('*').then(({ data, error }) => {
       if (error) {
         console.error("Supabase Error (Users):", error);
         // Even on error, callback empty array so app can load
         callback([]);
         return;
       }

       if (data && data.length > 0) {
          cache = data.map(mapUserFromDB);
          callback(cache);
       } else {
         // Seed mock users if empty and no error
         const seeded = MOCK_USERS.map(mapUserToDB);
         supabase.from('users').insert(seeded).then(({ error: seedError }) => {
            if (seedError) console.error("Seeding error:", seedError);
            cache = MOCK_USERS;
            callback(cache);
         });
       }
    });

    const channel = supabase.channel('users-change')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId == null) return;
            cache = cache.filter(u => u.id !== deletedId);
            callback(cache);
            return;
          }

          const changedId = (payload.new as any)?.id;
          if (!changedId) return;
          supabase.from('users_safe').select('*').eq('id', changedId).maybeSingle().then(({ data }) => {
             if (!data) return;
             const updated = mapUserFromDB(data);
             const idx = cache.findIndex(u => u.id === updated.id);
             cache = idx >= 0
               ? [...cache.slice(0, idx), updated, ...cache.slice(idx + 1)]
               : [updated, ...cache];
             callback(cache);
          });
      });

    setupChannelListeners(channel);

    return () => { supabase.removeChannel(channel); };
  },

  // Password check happens server-side in the verify-login edge function -
  // the client never reads the password column (see security_hardening.sql).
  verifyLogin: async (userId: string, password: string): Promise<{ status: 'ok' | 'invalid' | 'not_found' | 'error'; user?: User; message?: string }> => {
    const { data, error } = await supabase.functions.invoke('verify-login', { body: { userId, password } });
    if (error) {
      console.error("verify-login invoke error:", error);
      return { status: 'error', message: error.message };
    }
    return data;
  },

  saveUser: async (user: User) => {
    const { error } = await supabase.from('users').upsert(mapUserToDB(user));
    if (error) {
        console.error("Error saving user to Supabase:", error);
        return { error };
    }
    return { error: null };
  },
  
  deleteUser: async (id: string) => {
    await supabase.from('users').delete().eq('id', id);
  },

  // --- TASKS ---
  subscribeTasks: (callback: (tasks: Task[]) => void) => subscribeCollection('tasks', mapTaskFromDB, callback),

  addTask: async (task: Task) => {
    const { error } = await supabase.from('tasks').insert(mapTaskToDB(task));
    if (error) console.error("Error adding task:", error);
  },

  updateTask: async (task: Task) => {
    const { error } = await supabase.from('tasks').upsert(mapTaskToDB(task));
    if (error) console.error("Error updating task:", error);
  },

  batchUpdateTasks: async (tasks: Task[]) => {
    if (tasks.length === 0) return;
    const { error } = await supabase.from('tasks').upsert(tasks.map(mapTaskToDB));
    if (error) console.error("Error batch updating tasks:", error);
  },

  deleteTask: async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
  },

  deleteTasks: async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from('tasks').delete().in('id', ids);
    if (error) console.error("Error batch deleting tasks:", error);
  },

  // --- INVENTORY ---
  subscribeInventories: (callback: (files: InventoryFile[]) => void) => subscribeCollection('inventory_files', mapInventoryFromDB, callback),

  saveInventoryFile: async (file: InventoryFile) => {
    const { error } = await supabase.from('inventory_files').insert(mapInventoryToDB(file));
    if (error) console.error("Inventory save error:", error);
  },

  updateInventoryItems: async (fileId: string, updatedItems: InventoryItem[]) => {
    const { error } = await supabase.from('inventory_files').update({ data: updatedItems }).eq('id', fileId);
    if(error) console.error(error);
  },

  deleteInventoryFile: async (id: string) => {
    await supabase.from('inventory_files').delete().eq('id', id);
  },

  // --- INVOICES ---
  subscribeInvoices: (callback: (invoices: Invoice[]) => void) => subscribeCollection('invoices', mapInvoiceFromDB, callback),

  saveInvoice: async (invoice: Invoice) => {
    await supabase.from('invoices').upsert(mapInvoiceToDB(invoice));
  },

  deleteInvoice: async (id: string) => {
    await supabase.from('invoices').delete().eq('id', id);
  },

  // Invoice files (PDF/CSV) live in Supabase Storage, not as base64 blobs in
  // the invoices table - see supabase/invoice_storage_setup.sql. `path` is
  // stored on the invoice row as InvoiceFileMeta.storagePath.
  uploadInvoiceFile: async (path: string, file: File): Promise<{ error: Error | null }> => {
    const { error } = await supabase.storage.from(INVOICE_BUCKET).upload(path, file, { upsert: true });
    return { error };
  },

  downloadInvoiceFile: async (path: string): Promise<{ blob: Blob | null; error: Error | null }> => {
    const { data, error } = await supabase.storage.from(INVOICE_BUCKET).download(path);
    return { blob: data, error };
  },

  // --- ESCALATIONS ---
  subscribeEscalations: (callback: (escalations: Escalation[]) => void) => subscribeCollection('escalations', mapEscalationFromDB, callback),

  saveEscalation: async (esc: Escalation) => {
    await supabase.from('escalations').upsert(mapEscalationToDB(esc));
  },

  // --- LEAVE REQUESTS ---
  subscribeLeaveRequests: (callback: (requests: LeaveRequest[]) => void) => subscribeCollection('leave_requests', mapLeaveRequestFromDB, callback),

  saveLeaveRequest: async (req: LeaveRequest) => {
    console.log("Saving Leave Request:", req.id);
    const { error } = await supabase.from('leave_requests').upsert(mapLeaveRequestToDB(req));
    if (error) {
      console.error("Error saving leave request:", error);
      throw error;
    }
    console.log("Leave Request saved successfully.");
  },

  deleteLeaveRequest: async (id: string) => {
    await supabase.from('leave_requests').delete().eq('id', id);
  },

  fetchAllData: async () => {
    const [users, tasks, inventories, invoices, escalations, leaveRequests] = await Promise.all([
      supabase.from('users_safe').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('inventory_files').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('escalations').select('*'),
      supabase.from('leave_requests').select('*')
    ]);

    return {
      users: (users.data || []).map(mapUserFromDB),
      tasks: (tasks.data || []).map(mapTaskFromDB),
      inventories: (inventories.data || []).map(mapInventoryFromDB),
      invoices: (invoices.data || []).map(mapInvoiceFromDB),
      escalations: (escalations.data || []).map(mapEscalationFromDB),
      leaveRequests: (leaveRequests.data || []).map(mapLeaveRequestFromDB)
    };
  }
};
