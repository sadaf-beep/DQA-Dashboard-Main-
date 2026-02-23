
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Task, InventoryFile, User, InventoryItem, Invoice, Escalation, UserRole, TaskStatus, TaskPriority, TaskType } from '../types';
import { MOCK_USERS } from '../constants';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://jwxkgdwegwxlqddybszp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bsujv14yj35PMMC-Lz5V-A_DLBWTIbs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- HELPER MAPPERS (DB <-> App) ---

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
  password: row.password // In a real app, never return passwords!
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

const mapTaskFromDB = (row: any): Task => ({
  id: row.id,
  title: row.title,
  description: row.description,
  assigneeId: row.assignee_id,
  status: row.status as TaskStatus,
  priority: row.priority as TaskPriority,
  type: row.type as TaskType,
  tags: row.tags || [],
  dueDate: row.due_date,
  createdAt: Number(row.created_at),
  completedAt: row.completed_at ? Number(row.completed_at) : undefined,
  notes: row.notes || [],
  attachments: row.attachments || [],
  inventoryFileId: row.inventory_file_id,
  inventoryItemIds: row.inventory_item_ids,
  isEscalated: row.is_escalated
});

const mapTaskToDB = (task: Task) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  assignee_id: task.assigneeId,
  status: task.status,
  priority: task.priority,
  type: task.type,
  tags: task.tags,
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
  subscribeUsers: (callback: (users: User[]) => void) => {
    // Initial fetch
    supabase.from('users').select('*').then(({ data, error }) => {
       if (error) {
         console.error("Supabase Error (Users):", error);
         // Even on error, callback empty array so app can load
         callback([]);
         return;
       }

       if (data && data.length > 0) {
          callback(data.map(mapUserFromDB));
       } else {
         // Seed mock users if empty and no error
         const seeded = MOCK_USERS.map(mapUserToDB);
         supabase.from('users').insert(seeded).then(({ error: seedError }) => {
            if (seedError) console.error("Seeding error:", seedError);
            callback(MOCK_USERS);
         });
       }
    });

    // Realtime subscription
    const channel = supabase.channel('users-change')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
          supabase.from('users').select('*').then(({ data }) => {
             if (data) callback(data.map(mapUserFromDB));
          });
      });
      
    setupChannelListeners(channel);

    return () => { supabase.removeChannel(channel); };
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
  subscribeTasks: (callback: (tasks: Task[]) => void) => {
    supabase.from('tasks').select('*').then(({ data }) => {
      if (data) callback(data.map(mapTaskFromDB));
    });

    const channel = supabase.channel('tasks-change')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
         supabase.from('tasks').select('*').then(({ data }) => {
           if (data) callback(data.map(mapTaskFromDB));
         });
      });
      
    setupChannelListeners(channel);

    return () => { supabase.removeChannel(channel); };
  },

  addTask: async (task: Task) => {
    await supabase.from('tasks').insert(mapTaskToDB(task));
  },

  updateTask: async (task: Task) => {
    await supabase.from('tasks').upsert(mapTaskToDB(task));
  },

  deleteTask: async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
  },

  // --- INVENTORY ---
  subscribeInventories: (callback: (files: InventoryFile[]) => void) => {
    supabase.from('inventory_files').select('*').then(({ data }) => {
      if (data) callback(data.map(mapInventoryFromDB));
    });

    const channel = supabase.channel('inventory-change')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_files' }, () => {
         supabase.from('inventory_files').select('*').then(({ data }) => {
           if (data) callback(data.map(mapInventoryFromDB));
         });
      });
      
    setupChannelListeners(channel);
      
    return () => { supabase.removeChannel(channel); };
  },

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
  subscribeInvoices: (callback: (invoices: Invoice[]) => void) => {
    supabase.from('invoices').select('*').then(({ data }) => {
      if (data) callback(data.map(mapInvoiceFromDB));
    });

    const channel = supabase.channel('invoices-change')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
         supabase.from('invoices').select('*').then(({ data }) => {
           if (data) callback(data.map(mapInvoiceFromDB));
         });
      });

    setupChannelListeners(channel);

    return () => { supabase.removeChannel(channel); };
  },

  saveInvoice: async (invoice: Invoice) => {
    await supabase.from('invoices').upsert(mapInvoiceToDB(invoice));
  },
  
  deleteInvoice: async (id: string) => {
    await supabase.from('invoices').delete().eq('id', id);
  },

  // --- ESCALATIONS ---
  subscribeEscalations: (callback: (escalations: Escalation[]) => void) => {
    supabase.from('escalations').select('*').then(({ data }) => {
      if (data) callback(data.map(mapEscalationFromDB));
    });

    const channel = supabase.channel('escalations-change')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalations' }, () => {
         supabase.from('escalations').select('*').then(({ data }) => {
           if (data) callback(data.map(mapEscalationFromDB));
         });
      });

    setupChannelListeners(channel);

    return () => { supabase.removeChannel(channel); };
  },

  saveEscalation: async (esc: Escalation) => {
    await supabase.from('escalations').upsert(mapEscalationToDB(esc));
  },

  fetchAllData: async () => {
    const [users, tasks, inventories, invoices, escalations] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('inventory_files').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('escalations').select('*')
    ]);

    return {
      users: (users.data || []).map(mapUserFromDB),
      tasks: (tasks.data || []).map(mapTaskFromDB),
      inventories: (inventories.data || []).map(mapInventoryFromDB),
      invoices: (invoices.data || []).map(mapInvoiceFromDB),
      escalations: (escalations.data || []).map(mapEscalationFromDB)
    };
  }
};
