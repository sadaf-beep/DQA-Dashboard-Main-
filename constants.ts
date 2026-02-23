
import { User, UserRole, TaskStatus, TaskPriority, TaskType } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    username: 'sadaf',
    name: 'Sadaf Amrita',
    role: UserRole.MANAGER,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
    email: 'sadaf@beamdynamics.io',
    phone: '555-0101',
    address: '123 Headquarters Blvd, New York, NY',
    country: 'USA',
    joiningDate: '1/15/2022',
    payRate: 0,
  }
];

export const INITIAL_TASKS = [
  {
    id: 't1',
    title: 'Validate Q3 Inventory Data',
    description: 'Check for discrepancies in the warehouse CSV exports from last week.',
    assigneeId: 'u1',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    type: TaskType.DATA_REFRESHER,
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    createdAt: Date.now() - 172800000,
  },
  {
    id: 't2',
    title: 'Update SKU Mappings',
    description: 'The new product line needs SKU mapping updates in the main database.',
    assigneeId: 'u1',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    type: TaskType.AUGMENTING,
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    createdAt: Date.now() - 86400000,
  }
];

export const APP_NAME = "DQA Task Management";
