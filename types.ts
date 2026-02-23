
export enum UserRole {
  MANAGER = 'MANAGER',
  AGENT = 'AGENT',
}

export interface UserSchedule {
  nominatedStart: string; // e.g. "09:00"
  nominatedEnd: string;   // e.g. "17:00"
  loginHistory: number[]; // Array of timestamps
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  password?: string; // Added for auth
  // Extended Profile Fields
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  joiningDate?: string;
  payRate?: number; // Hourly rate
  schedule?: UserSchedule;
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TaskType {
  AUGMENTING = 'AUGMENTING',
  QA = 'QA',
  CHECK_404 = '404_CHECK',
  INVOICE_PROCESSING = 'INVOICE_PROCESSING',
  DATA_REFRESHER = 'DATA_REFRESHER'
}

export interface TaskNote {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
}

export interface TaskAttachment {
  name: string;
  url?: string; // In a real app, this is a link. Here we might just track the name.
  type: 'pdf' | 'csv' | 'img' | 'doc';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string; // User ID
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  tags?: string[]; // Added tags support
  dueDate: string;
  createdAt: number;
  completedAt?: number; // Added for turnaround time calculation
  notes?: TaskNote[];
  attachments?: TaskAttachment[];
  isEscalated?: boolean; // Visual flag
  inventoryFileId?: string; // Link to inventory file
  inventoryItemIds?: string[]; // Link to specific items
}

export interface EscalationMessage {
  id: string;
  authorId: string;
  authorName: string;
  role: UserRole;
  text: string;
  timestamp: number;
}

export interface Escalation {
  id: string;
  taskId: string;
  taskTitle: string;
  agentId: string;
  agentName: string;
  link?: string;
  // Replaced single reason/note with a thread history
  history: EscalationMessage[]; 
  status: 'PENDING' | 'RESPONDED' | 'CLOSED'; 
  createdAt: number;
  updatedAt: number;
}

// Strict Inventory Schema
export enum InventoryStatus {
  PENDING = 'PENDING',               // Just uploaded
  ASSIGNED_AUGMENTATION = 'ASSIGNED_AUGMENTATION', // Assigned to agent for work
  AUGMENTED = 'AUGMENTED',           // Agent finished augmentation
  ASSIGNED_QA = 'ASSIGNED_QA',       // Assigned to agent for QA
  QA_COMPLETE = 'QA_COMPLETE'        // QA Passed
}

export interface InventoryItem {
  id: string; // Internal ID for UI tracking
  
  // Specific CSV Fields
  productId: string;
  productName: string; // "Name"
  model: string;
  csvStatus?: string; // "Status" column from CSV
  augmented?: string; // "Augmented" column
  reviewed?: string; // "Reviewed" column
  reviewedBy?: string; // "Reviewed By" column
  mfr: string; // "Manufacturer"
  studio: string; // "Studio Name"
  dimension?: string; // "Dimension"
  approxMatch?: string; // "Approx Mat"
  
  // DQA App Workflow Tracking
  status: InventoryStatus;
  assigneeId?: string;
  assigneeName?: string;
  assignmentStartDate?: string;
  assignmentDueDate?: string;
  
  // Allow other fields for flexibility if needed
  [key: string]: string | number | boolean | undefined;
}

export interface InventoryFile {
  id: string;
  fileName: string;
  uploadDate: number;
  rowCount: number;
  data: InventoryItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
}

// --- INVOICE MODULE ---

export interface InvoiceFileMeta {
  name: string;
  size: string;
  type: 'pdf' | 'csv';
  content?: string; // Base64 or Text content
}

export interface Invoice {
  id: string;
  referenceName: string; // e.g. "Studio A - Jan Invoice"
  status: 'PENDING' | 'ASSIGNED' | 'COMPLETED' | 'UPLOADED';
  pdfFile: InvoiceFileMeta;
  csvFile?: InvoiceFileMeta; // Optional
  finalCsvFile?: InvoiceFileMeta; // New field for agent output
  assigneeId?: string;
  assigneeName?: string;
  startDate?: string;
  dueDate?: string;
  isPreProcessed: boolean; // True if CSV is attached
  createdAt: number;
  completedAt?: number;
}

// --- ANALYTICS ---
export interface OperationalStats {
  totalAugmented: number;
  totalQAed: number;
  totalInvoices: number;
  agentVolume: Record<string, number>;
  studioProgress: Array<{
    name: string;
    total: number;
    augmented: number;
    qa: number;
  }>;
}
