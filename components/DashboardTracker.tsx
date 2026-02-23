
import React, { useState, useMemo } from 'react';
import { Task, User, TaskType, TaskStatus, TaskPriority, TaskAttachment } from '../types';

interface DashboardTrackerProps {
  tasks: Task[];
  users: User[];
  onUpdateTask: (task: Task) => void;
}

interface TrackerRow {
  id: string;
  originalTasks: Task[];
  category: string;
  studioName: string;
  taskLabel: string;
  status: TaskStatus;
  priority: TaskPriority;
  attachments: TaskAttachment[];
  assigneeIds: string[];
  dueDate: string;
  createdAt: number;
}

const DashboardTracker: React.FC<DashboardTrackerProps> = ({ tasks, users, onUpdateTask }) => {
  const [sortField, setSortField] = useState<keyof TrackerRow | 'studio'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Helper to extract "Studio/Project" from task titles based on app naming conventions
  const getStudioName = (task: Task) => {
    // New Automation Format: "StudioName_QA Review" -> Returns "StudioName"
    if (task.title.includes('_QA Review')) {
      return task.title.replace('_QA Review', '').trim();
    }
    
    if (task.type === TaskType.INVOICE_PROCESSING) {
      return task.title.replace('Process Invoice:', '').trim();
    }
    if (task.title.includes('items in')) {
      const parts = task.title.split('items in');
      if (parts.length > 1) return parts[1].trim();
    }
    if (task.title.includes('products in')) {
      const parts = task.title.split('products in');
      if (parts.length > 1) return parts[1].trim();
    }
    // Fallback: try to clean up common prefixes if needed, or return title
    return task.title;
  };

  // Helper to determine Category (Trial vs Paid vs Invoice)
  const getCategory = (task: Task) => {
    if (task.type === TaskType.INVOICE_PROCESSING) return 'Invoice';
    // Logic: If tag contains "Trial" or title contains "Trial", it's Trial Studio
    if (task.title.toLowerCase().includes('trial') || (task.tags && task.tags.some(t => t.toLowerCase().includes('trial')))) return 'Trial Studio';
    return 'Paid Studio'; 
  };

  // Styles matching the spreadsheet screenshot
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'Invoice': return 'bg-purple-100 text-purple-800 font-bold';
      case 'Trial Studio': return 'bg-red-700 text-white font-bold'; 
      case 'Paid Studio': return 'bg-emerald-700 text-white font-bold'; 
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getTaskNameStyles = (label: string) => {
     if (label.includes('Augmenting') && label.includes('QA')) return 'bg-gradient-to-r from-red-700 to-emerald-700 text-white font-bold';
     if (label.includes('Augmenting')) return 'bg-red-700 text-white font-bold';
     if (label.includes('QA')) return 'bg-emerald-100 text-emerald-800 font-bold';
     if (label.includes('Invoice')) return 'bg-rose-100 text-rose-800 font-bold';
     return 'bg-slate-50 text-slate-700';
  };

  const getTaskLabel = (type: TaskType) => {
    switch (type) {
      case TaskType.AUGMENTING: return 'Augmenting';
      case TaskType.QA: return 'QA Review';
      case TaskType.INVOICE_PROCESSING: return 'Invoice Processing';
      default: return type.replace('_', ' ');
    }
  };

  const getStatusStyles = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE: return 'bg-emerald-700 text-white';
      case TaskStatus.IN_PROGRESS: return 'bg-blue-600 text-white';
      case TaskStatus.TODO: return 'bg-slate-200 text-slate-700';
      case TaskStatus.ON_HOLD: return 'bg-amber-400 text-amber-900';
      default: return 'bg-slate-100';
    }
  };

  const getPriorityStyles = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.CRITICAL: 
      case TaskPriority.HIGH: return 'bg-amber-100 text-amber-800';
      default: return 'bg-emerald-100 text-emerald-800';
    }
  };

  const handleStatusChange = (row: TrackerRow, newStatus: string) => {
    // Update all tasks in the group
    row.originalTasks.forEach(task => {
        if (task.status !== newStatus) {
            onUpdateTask({ ...task, status: newStatus as TaskStatus });
        }
    });
  };

  const handlePriorityChange = (row: TrackerRow, newPriority: string) => {
    row.originalTasks.forEach(task => {
        if (task.priority !== newPriority) {
            onUpdateTask({ ...task, priority: newPriority as TaskPriority });
        }
    });
  };
  
  const handleAssigneeChange = (row: TrackerRow, newAssigneeId: string) => {
    // Assign all tasks in group to the new single assignee
    row.originalTasks.forEach(task => {
        if (task.assigneeId !== newAssigneeId) {
            onUpdateTask({ ...task, assigneeId: newAssigneeId });
        }
    });
  };

  // Process data for table
  const tableData = useMemo(() => {
    // Group by Studio Name
    const groups: Record<string, Task[]> = {};
    tasks.forEach(t => {
        // Filter out "Upload to Beam" tasks as they are for Manager only and shouldn't clutter the main tracker
        if (t.title.startsWith('Upload to Beam:')) return;

        const name = getStudioName(t);
        // Use a composite key of name + category to avoid merging distinct projects with same name if that ever happens
        // But for now name is the main identifier.
        if (!groups[name]) groups[name] = [];
        groups[name].push(t);
    });

    const rows: TrackerRow[] = Object.values(groups).map(groupTasks => {
        const primary = groupTasks[0]; // Representative task

        // Collect Assignees
        const assigneeIds = Array.from(new Set(groupTasks.map(t => t.assigneeId).filter(Boolean)));

        // Composite Status Logic
        let compositeStatus = TaskStatus.TODO;
        const statuses = groupTasks.map(t => t.status);
        if (statuses.every(s => s === TaskStatus.DONE)) compositeStatus = TaskStatus.DONE;
        else if (statuses.some(s => s === TaskStatus.IN_PROGRESS) || (statuses.some(s => s === TaskStatus.DONE) && statuses.some(s => s === TaskStatus.TODO))) compositeStatus = TaskStatus.IN_PROGRESS;
        else if (statuses.some(s => s === TaskStatus.ON_HOLD)) compositeStatus = TaskStatus.ON_HOLD;

        // Composite Priority (Max)
        let compositePriority = TaskPriority.LOW;
        const priorities = groupTasks.map(t => t.priority);
        if (priorities.includes(TaskPriority.CRITICAL)) compositePriority = TaskPriority.CRITICAL;
        else if (priorities.includes(TaskPriority.HIGH)) compositePriority = TaskPriority.HIGH;
        else if (priorities.includes(TaskPriority.MEDIUM)) compositePriority = TaskPriority.MEDIUM;

        // Task Labels (Join unique)
        const labels = Array.from(new Set(groupTasks.map(t => getTaskLabel(t.type)))).join(' & ');

        // Attachments (Unique by name/url)
        const allAtts = groupTasks.flatMap(t => t.attachments || []);
        const seenAtts = new Set<string>();
        const uniqueAtts: TaskAttachment[] = [];
        allAtts.forEach(a => {
            const key = a.name + (a.url || '');
            if (!seenAtts.has(key)) {
                seenAtts.add(key);
                uniqueAtts.push(a);
            }
        });

        return {
            id: primary.id,
            originalTasks: groupTasks,
            category: getCategory(primary),
            studioName: getStudioName(primary),
            taskLabel: labels,
            status: compositeStatus,
            priority: compositePriority,
            attachments: uniqueAtts,
            assigneeIds: assigneeIds,
            dueDate: primary.dueDate,
            createdAt: Math.min(...groupTasks.map(t => t.createdAt))
        };
    });

    return rows.sort((a, b) => {
      // Custom sort for Studio Name (alphabetical) vs generic
      if (sortField === 'studioName') {
          return sortDir === 'asc' 
            ? a.studioName.localeCompare(b.studioName)
            : b.studioName.localeCompare(a.studioName);
      }
      
      const fieldA = a[sortField as keyof TrackerRow];
      const fieldB = b[sortField as keyof TrackerRow];
      
      if (fieldA < fieldB) return sortDir === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, users, sortField, sortDir]);

  const handleSort = (field: keyof TrackerRow) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[500px]">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          Master Daily Tracker
        </h3>
        <div className="flex gap-2 text-xs text-slate-500">
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-700"></span> Trial/Augment</span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-700"></span> Paid/Done</span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-100 border border-purple-200"></span> Invoice</span>
        </div>
      </div>
      
      <div className="overflow-auto flex-1 w-full">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs text-white uppercase bg-indigo-600 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-indigo-700" onClick={() => handleSort('createdAt')}>
                Date Created {sortField === 'createdAt' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-indigo-700" onClick={() => handleSort('studioName')}>
                Studio/Project {sortField === 'studioName' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 font-semibold">Task Name</th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-indigo-700" onClick={() => handleSort('status')}>
                Status {sortField === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-indigo-700" onClick={() => handleSort('priority')}>
                Priority
              </th>
              <th className="px-4 py-3 font-semibold">Attachments</th>
              <th className="px-4 py-3 font-semibold">Assigned To</th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-indigo-700" onClick={() => handleSort('dueDate')}>
                 Due Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tableData.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2 text-slate-600 whitespace-nowrap text-xs">
                   {new Date(row.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                   <div className={`px-2 py-1 rounded text-[11px] w-fit ${getCategoryStyles(row.category)}`}>
                     {row.category}
                   </div>
                </td>
                <td className="px-4 py-2 font-medium text-slate-800 text-xs">
                   {row.studioName}
                </td>
                <td className="px-4 py-2">
                   <div className={`px-2 py-1 rounded text-[11px] w-fit ${getTaskNameStyles(row.taskLabel)}`}>
                     {row.taskLabel}
                   </div>
                </td>
                <td className="px-4 py-2">
                   <select 
                     value={row.status}
                     onChange={(e) => handleStatusChange(row, e.target.value)}
                     className={`px-2 py-1 rounded text-[11px] font-bold border-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full ${getStatusStyles(row.status)}`}
                   >
                     {Object.values(TaskStatus).map(s => (
                       <option key={s} value={s} className="bg-white text-slate-800">{s.replace('_', ' ')}</option>
                     ))}
                   </select>
                </td>
                <td className="px-4 py-2">
                   <select 
                     value={row.priority}
                     onChange={(e) => handlePriorityChange(row, e.target.value)}
                     className={`px-2 py-1 rounded text-[11px] font-bold border-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full ${getPriorityStyles(row.priority)}`}
                   >
                     {Object.values(TaskPriority).map(p => (
                       <option key={p} value={p} className="bg-white text-slate-800">{p}</option>
                     ))}
                   </select>
                </td>
                <td className="px-4 py-2">
                   {row.attachments && row.attachments.length > 0 ? (
                     <div className="flex flex-col gap-1">
                       {row.attachments.slice(0, 2).map((att, i) => (
                         <div key={i} className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 max-w-[150px] truncate">
                            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            <span className="truncate">{att.name}</span>
                         </div>
                       ))}
                       {row.attachments.length > 2 && <span className="text-[10px] text-slate-400">+{row.attachments.length - 2}</span>}
                     </div>
                   ) : <span className="text-slate-300">-</span>}
                </td>
                <td className="px-4 py-2">
                   {row.assigneeIds.length > 1 ? (
                       <div className="flex flex-col gap-1">
                           {row.assigneeIds.map(uid => {
                               const user = users.find(u => u.id === uid);
                               return (
                                   <div key={uid} className="flex items-center gap-1">
                                       {user?.avatar ? (
                                           <img src={user.avatar} className="w-4 h-4 rounded-full" alt="" />
                                       ) : (
                                           <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">{user?.name.charAt(0)}</div>
                                       )}
                                       <span className="text-xs text-slate-700">{user?.name || 'Unknown'}</span>
                                   </div>
                               );
                           })}
                           {/* Add All / Edit Button could go here if needed, keeping simple for now */}
                       </div>
                   ) : (
                       <select 
                         value={row.assigneeIds[0] || ''}
                         onChange={(e) => handleAssigneeChange(row, e.target.value)}
                         className="bg-transparent text-xs text-slate-700 font-medium border-b border-transparent hover:border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer w-full truncate"
                       >
                         <option value="">Unassigned</option>
                         {users.map(u => (
                           <option key={u.id} value={u.id}>{u.name}</option>
                         ))}
                       </select>
                   )}
                </td>
                <td className="px-4 py-2 text-slate-600 whitespace-nowrap text-xs">
                   {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
            {tableData.length === 0 && (
               <tr>
                 <td colSpan={9} className="p-8 text-center text-slate-400 italic">No records found.</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardTracker;
