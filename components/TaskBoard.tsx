
import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, User, TaskType, TaskNote, TaskAttachment, UserRole, Escalation } from '../types';
import { Button, Card, Badge } from './Common';
import { EscalationModal } from './EscalationModal';

interface TaskBoardProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onEscalateTask?: (task: Task, reason: string, link?: string) => void; 
  escalations?: Escalation[];
  onResolveEscalation?: (escalation: Escalation, message: string) => void;
  onCloseEscalation?: (escalation: Escalation) => void; 
}

const AVAILABLE_TAGS = [
  '404 Error',
  'Invoice Processing',
  'Item Classification',
  'Price Information',
  'Data Refresher'
];

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, users, currentUser, onAddTask, onUpdateTask, onDeleteTask, onEscalateTask, escalations = [], onResolveEscalation, onCloseEscalation }) => {
  const [filter, setFilter] = useState<'ALL' | 'MY_TASKS'>('ALL');
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUser.id);
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [newTaskType, setNewTaskType] = useState<TaskType>(TaskType.AUGMENTING);
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTags, setNewTaskTags] = useState<string[]>([]);
  const [newTaskAttachments, setNewTaskAttachments] = useState<TaskAttachment[]>([]);

  // Detail/Edit Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [showHoldInput, setShowHoldInput] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Escalation Creation State
  const [showEscalationInput, setShowEscalationInput] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalationLink, setEscalationLink] = useState('');
  
  // Escalation View/Chat State
  const [activeEscalationForChat, setActiveEscalationForChat] = useState<Escalation | null>(null);

  // --- STATE SYNCING EFFECT ---
  useEffect(() => {
    if (selectedTask) {
        const freshTask = tasks.find(t => t.id === selectedTask.id);
        if (freshTask && freshTask !== selectedTask) {
            setSelectedTask(freshTask);
        }
    }
  }, [tasks, selectedTask]);

  useEffect(() => {
    if (activeEscalationForChat) {
        const freshEscalation = escalations.find(e => e.id === activeEscalationForChat.id);
        if (freshEscalation && freshEscalation !== activeEscalationForChat) {
            setActiveEscalationForChat(freshEscalation);
        }
    }
  }, [escalations, activeEscalationForChat]);

  // Filtering Logic: Agents can now see all tasks, but UI restricts editing.
  const filteredTasks = tasks.filter(t => {
    return filter === 'ALL' || t.assigneeId === currentUser.id;
  });

  const columns = [
    { id: TaskStatus.TODO, label: 'To Do', color: 'bg-slate-100/50', dotColor: 'bg-slate-400' },
    { id: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-blue-50/50', dotColor: 'bg-blue-500' },
    { id: TaskStatus.DONE, label: 'Complete', color: 'bg-emerald-50/50', dotColor: 'bg-emerald-500' },
  ];

  const getTypeStyles = (t: TaskType) => {
    switch (t) {
      case TaskType.AUGMENTING: return 'bg-purple-100 text-purple-700 border-purple-200';
      case TaskType.QA: return 'bg-amber-100 text-amber-700 border-amber-200';
      case TaskType.INVOICE_PROCESSING: return 'bg-blue-100 text-blue-700 border-blue-200';
      case TaskType.CHECK_404: return 'bg-rose-100 text-rose-700 border-rose-200';
      case TaskType.DATA_REFRESHER: return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityStyles = (p: TaskPriority) => {
    switch (p) {
        case TaskPriority.CRITICAL: return 'text-red-600 bg-red-50 ring-red-500/10';
        case TaskPriority.HIGH: return 'text-orange-600 bg-orange-50 ring-orange-500/10';
        case TaskPriority.MEDIUM: return 'text-blue-600 bg-blue-50 ring-blue-500/10';
        case TaskPriority.LOW: return 'text-slate-600 bg-slate-50 ring-slate-500/10';
        default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getTypeLabel = (t: TaskType) => {
    switch (t) {
      case TaskType.AUGMENTING: return 'Augmentation';
      case TaskType.QA: return 'QA Check';
      case TaskType.CHECK_404: return '404 Check';
      case TaskType.INVOICE_PROCESSING: return 'Invoice';
      case TaskType.DATA_REFRESHER: return 'Data Refresh';
      default: return t;
    }
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTask({
      title: newTaskTitle,
      description: newTaskDesc,
      assigneeId: newTaskAssignee,
      priority: newTaskPriority,
      type: newTaskType,
      status: TaskStatus.TODO,
      tags: newTaskTags,
      dueDate: newTaskDate || new Date().toISOString(),
      notes: [],
      attachments: newTaskAttachments 
    });
    setIsCreateModalOpen(false);
    resetCreateForm();
  };

  const resetCreateForm = () => {
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskAttachments([]);
    setNewTaskTags([]);
    setNewTaskDate('');
  };

  const toggleTag = (tag: string) => {
    setNewTaskTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const processedFiles = await Promise.all(Array.from(files).map(async (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        let type: TaskAttachment['type'] = 'doc';
        if (ext === 'pdf') type = 'pdf';
        if (ext === 'csv') type = 'csv';
        if (['jpg', 'jpeg', 'png'].includes(ext || '')) type = 'img';
        
        const url = await readFile(file);
        
        return { name: file.name, type: type, url: url };
      }));
      setNewTaskAttachments(prev => [...prev, ...processedFiles]);
    }
  };

  const handleDetailFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTask) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const processedFiles = await Promise.all(Array.from(files).map(async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let type: TaskAttachment['type'] = 'doc';
      if (ext === 'pdf') type = 'pdf';
      if (ext === 'csv') type = 'csv';
      if (['jpg', 'jpeg', 'png'].includes(ext || '')) type = 'img';
      
      const url = await readFile(file);
      
      return { name: file.name, type: type, url: url };
    }));

    const updatedTask = {
      ...selectedTask,
      attachments: [...(selectedTask.attachments || []), ...processedFiles]
    };

    onUpdateTask(updatedTask);
    setSelectedTask(updatedTask);
  };

  const handleDeleteAttachment = (indexToRemove: number) => {
    if (!selectedTask || !selectedTask.attachments) return;
    const updatedTask = {
        ...selectedTask,
        attachments: selectedTask.attachments.filter((_, idx) => idx !== indexToRemove)
    };
    onUpdateTask(updatedTask);
    setSelectedTask(updatedTask);
  };

  const handleDownloadAttachment = (attachment: TaskAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.url || '#';
    link.download = attachment.name;
    
    if (!attachment.url) {
       const blob = new Blob([`Content placeholder for ${attachment.name}`], { type: 'text/plain' });
       link.href = URL.createObjectURL(blob);
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (!attachment.url) URL.revokeObjectURL(link.href);
  };

  const handleAddNote = (task: Task, text: string) => {
    if (!text.trim()) return;
    const newNote: TaskNote = {
      id: Date.now().toString(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      text: text,
      timestamp: Date.now()
    };
    
    const updatedTask = {
      ...task,
      notes: [newNote, ...(task.notes || [])]
    };

    onUpdateTask(updatedTask);
    setSelectedTask(updatedTask); // Optimistic update
    setNoteInput('');
  };

  const handleStatusChange = (task: Task, newStatus: TaskStatus, note?: string) => {
    let updatedTask = { ...task, status: newStatus };
    
    if (note) {
      const newNote: TaskNote = {
        id: Date.now().toString(),
        authorId: currentUser.id,
        authorName: currentUser.name,
        text: `Status changed to ${newStatus}: ${note}`,
        timestamp: Date.now()
      };
      updatedTask.notes = [newNote, ...(task.notes || [])];
    }

    onUpdateTask(updatedTask);
    setSelectedTask(updatedTask); 
    setShowHoldInput(false);
  };

  const handleConfirmDelete = () => {
    if (!selectedTask) return;
    onDeleteTask(selectedTask.id);
    setShowDeleteConfirm(false);
    setSelectedTask(null);
  };

  const handleConfirmEscalation = () => {
    if(!selectedTask || !onEscalateTask || !escalationReason.trim()) return;
    onEscalateTask(selectedTask, escalationReason, escalationLink);
    setShowEscalationInput(false);
    setEscalationReason('');
    setEscalationLink('');
  };
  
  const handleEscalationReply = (message: string) => {
      if(!activeEscalationForChat || !onResolveEscalation) return;
      onResolveEscalation(activeEscalationForChat, message);
  };

  const handleAgentClose = () => {
      if(!activeEscalationForChat || !onCloseEscalation) return;
      onCloseEscalation(activeEscalationForChat);
      setActiveEscalationForChat(null); // Close the modal
  };

  const isAutomatedTask = (type: TaskType) => {
    return type === TaskType.AUGMENTING || type === TaskType.QA;
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowHoldInput(false);
    setShowDeleteConfirm(false);
    setShowEscalationInput(false);
    setActiveEscalationForChat(null);
  };

  // Derived state for the modal
  const currentTaskEscalations = selectedTask ? escalations.filter(e => e.taskId === selectedTask.id) : [];
  const activeEscalations = currentTaskEscalations.filter(e => e.status !== 'CLOSED');
  const hasActiveEscalations = activeEscalations.length > 0;

  // Determine if current user can edit the selected task
  const canEditTask = selectedTask ? (currentUser.role === UserRole.MANAGER || selectedTask.assigneeId === currentUser.id) : false;

  return (
    <div className="h-full flex flex-col">
      {/* Header Toolbar */}
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Task Board</h2>
           <p className="text-sm text-slate-500">Manage and track team assignments</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${filter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All Tasks
            </button>
            <button 
              onClick={() => setFilter('MY_TASKS')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${filter === 'MY_TASKS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              My Tasks
            </button>
          </div>
          
          {currentUser.role === UserRole.MANAGER && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-md shadow-blue-500/20">
                + New Task
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 min-w-full h-full pb-4">
          {columns.map(col => {
            const columnTasks = filteredTasks.filter(t => t.status === col.id || (col.id === TaskStatus.TODO && t.status === TaskStatus.ON_HOLD));
            
            return (
              <div key={col.id} className="w-96 flex flex-col h-full rounded-2xl bg-slate-50/80 border border-slate-100">
                {/* Column Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.dotColor}`}></div>
                    <h3 className="font-semibold text-slate-700 text-sm tracking-wide uppercase">{col.label}</h3>
                  </div>
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                    {columnTasks.length}
                  </span>
                </div>
                
                {/* Scrollable Task List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {columnTasks.map(task => {
                    const assignee = users.find(u => u.id === task.assigneeId);
                    const isOverdue = new Date(task.dueDate) < new Date();
                    
                    return (
                      <div 
                        key={task.id} 
                        className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group ${task.status === TaskStatus.ON_HOLD ? 'ring-2 ring-amber-100 bg-amber-50/30' : ''}`}
                        onClick={() => handleTaskClick(task)}
                      >
                        {/* Tags */}
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex gap-2 flex-wrap">
                             <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${getTypeStyles(task.type)}`}>
                               {getTypeLabel(task.type)}
                             </span>
                             {task.tags?.map(tag => (
                               <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                 {tag}
                               </span>
                             ))}
                             {task.status === TaskStatus.ON_HOLD && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                                  ON HOLD
                                </span>
                             )}
                             {task.isEscalated && (
                                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-red-200 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                  ESCALATED
                                </span>
                             )}
                           </div>
                           <div className="flex items-center gap-2">
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${getPriorityStyles(task.priority)}`}>
                                  {task.priority}
                               </span>
                               {currentUser.role === UserRole.MANAGER && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if(window.confirm('Delete this task?')) {
                                                onDeleteTask(task.id);
                                            }
                                        }}
                                        className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                                        title="Delete Task"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                               )}
                           </div>
                        </div>
                        
                        {/* Title */}
                        <h4 className="font-semibold text-slate-800 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                            {task.title}
                        </h4>
                        
                        {/* Footer Info */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                            {assignee?.avatar ? (
                               <img src={assignee.avatar} alt={assignee.name} className="w-6 h-6 rounded-full border border-slate-200" />
                            ) : (
                               <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                 {assignee?.name.charAt(0) || '?'}
                               </div>
                            )}
                            <span className="text-xs text-slate-500 font-medium truncate max-w-[80px]">{assignee?.name || 'Unassigned'}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                             {task.attachments && task.attachments.length > 0 && (
                                <span className="text-xs text-slate-400 flex items-center gap-1" title={`${task.attachments.length} attachments`}>
                                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                   {task.attachments.length}
                                </span>
                             )}
                             <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                             </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
                        <span className="text-slate-400 text-sm font-medium">No tasks</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Detail Modal - Improved Aesthetic */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden" onClick={e => e.stopPropagation()}>
              
              {/* LEFT PANEL: Content (65%) */}
              <div className="flex-1 flex flex-col overflow-y-auto border-r border-slate-100">
                 {/* Header */}
                 <div className="p-8 border-b border-slate-100">
                    <div className="flex flex-wrap gap-2 mb-4">
                       <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wider border ${getTypeStyles(selectedTask.type)}`}>
                          {getTypeLabel(selectedTask.type)}
                       </span>
                       {selectedTask.tags?.map(tag => (
                          <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            {tag}
                          </span>
                       ))}
                       {hasActiveEscalations && (
                          <span className="bg-red-500 text-white px-2.5 py-1 rounded-md text-xs font-bold tracking-wider animate-pulse shadow-md shadow-red-500/30">
                              ESCALATED
                          </span>
                       )}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 leading-tight">{selectedTask.title}</h2>
                 </div>

                 <div className="p-8 space-y-8 flex-1">
                    {/* Description */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                           <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                           Description
                        </h3>
                        <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                           {selectedTask.description || "No description provided."}
                        </div>
                    </section>

                    {/* Activity Feed */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                           <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                           Activity & Notes
                        </h3>
                        
                        <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2">
                           {selectedTask.notes?.map(note => {
                              const isMe = note.authorId === currentUser.id;
                              return (
                                <div key={note.id} className={`flex gap-3 items-start ${isMe ? 'flex-row-reverse' : ''}`}>
                                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isMe ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                                      {note.authorName.charAt(0)}
                                   </div>
                                   <div className={`p-3 rounded-2xl border flex-1 ${isMe ? 'bg-blue-50 border-blue-100 rounded-tr-none' : 'bg-slate-50 border-slate-100 rounded-tl-none'}`}>
                                      <div className={`flex justify-between items-center mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                         <span className="font-bold text-xs text-slate-700">{note.authorName}</span>
                                         <span className="text-[10px] text-slate-400">{new Date(note.timestamp).toLocaleString()}</span>
                                      </div>
                                      <p className={`text-sm ${isMe ? 'text-blue-900' : 'text-slate-600'}`}>{note.text}</p>
                                   </div>
                                </div>
                              );
                           })}
                           {(!selectedTask.notes || selectedTask.notes.length === 0) && (
                              <p className="text-sm text-slate-400 italic pl-2">No activity yet.</p>
                           )}
                        </div>

                        {canEditTask && (
                          <div className="flex gap-2 items-start">
                             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0 mt-1">
                                {currentUser.name.charAt(0)}
                             </div>
                             <div className="flex-1">
                                <input 
                                  type="text" 
                                  placeholder="Leave a note or update..." 
                                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                  value={noteInput}
                                  onChange={e => setNoteInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleAddNote(selectedTask, noteInput)}
                                />
                                <div className="flex justify-end mt-2">
                                  <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={() => handleAddNote(selectedTask, noteInput)}>Post Note</Button>
                                </div>
                             </div>
                          </div>
                        )}
                    </section>
                 </div>
              </div>

              {/* RIGHT PANEL: Metadata Sidebar (35%) */}
              <div className="w-[350px] bg-slate-50 border-l border-slate-200 flex flex-col overflow-y-auto">
                 <div className="p-6 space-y-6">
                    {/* Status */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block">Status</label>
                        <select 
                           className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 disabled:opacity-60 disabled:bg-slate-100"
                           value={selectedTask.status}
                           onChange={(e) => handleStatusChange(selectedTask, e.target.value as TaskStatus)}
                           disabled={!canEditTask || (selectedTask.status === TaskStatus.DONE && isAutomatedTask(selectedTask.type))}
                        >
                           {Object.values(TaskStatus).map(s => (
                             <option key={s} value={s}>{s.replace('_', ' ')}</option>
                           ))}
                        </select>
                    </div>

                    {/* ESCALATION LIST - REFACTORED */}
                    {currentTaskEscalations.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-red-800 uppercase mb-3 flex items-center gap-2">
                                Escalations ({activeEscalations.length} Active)
                            </h4>
                            <div className="space-y-3">
                                {currentTaskEscalations.map(esc => (
                                    <div 
                                        key={esc.id} 
                                        className={`bg-white p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                                            esc.status === 'PENDING' ? 'border-red-200 border-l-4 border-l-red-500' : 
                                            esc.status === 'RESPONDED' ? 'border-blue-200 border-l-4 border-l-blue-500' : 
                                            'border-slate-200 opacity-60'
                                        }`}
                                        onClick={() => setActiveEscalationForChat(esc)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-slate-700">{esc.agentName}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                                                esc.status === 'PENDING' ? 'bg-red-100 text-red-700' : 
                                                esc.status === 'RESPONDED' ? 'bg-blue-100 text-blue-700' : 
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {esc.status}
                                            </span>
                                        </div>
                                        {/* Show only latest message preview */}
                                        <p className="text-xs text-slate-600 line-clamp-2 italic">
                                            "{esc.history[esc.history.length-1].text}"
                                        </p>
                                        <div className="mt-2 text-[10px] text-blue-600 font-bold flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                                            Open Discussion
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Details Grid */}
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Assignee</label>
                           <div className="flex items-center gap-2">
                              {users.find(u => u.id === selectedTask.assigneeId)?.avatar ? (
                                <img src={users.find(u => u.id === selectedTask.assigneeId)?.avatar} className="w-6 h-6 rounded-full"/>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">{users.find(u => u.id === selectedTask.assigneeId)?.name.charAt(0) || '?'}</div>
                              )}
                              <span className="text-sm font-medium text-slate-700">{users.find(u => u.id === selectedTask.assigneeId)?.name || 'Unassigned'}</span>
                           </div>
                        </div>
                        <div className="h-px bg-slate-100 my-2"></div>
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Due Date</label>
                           <div className="flex items-center gap-2 text-slate-700 text-sm">
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {new Date(selectedTask.dueDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                           </div>
                        </div>
                         <div className="h-px bg-slate-100 my-2"></div>
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Priority</label>
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                              selectedTask.priority === TaskPriority.CRITICAL ? 'bg-red-50 text-red-700 border-red-100' : 
                              selectedTask.priority === TaskPriority.HIGH ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                           }`}>
                              {selectedTask.priority}
                           </span>
                        </div>
                         <div className="h-px bg-slate-100 my-2"></div>
                        {/* Tags in details */}
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Tags</label>
                           {selectedTask.tags && selectedTask.tags.length > 0 ? (
                               <div className="flex flex-wrap gap-1">
                                   {selectedTask.tags.map(tag => (
                                       <span key={tag} className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                           {tag}
                                       </span>
                                   ))}
                               </div>
                           ) : (
                               <span className="text-sm text-slate-400 italic">No tags</span>
                           )}
                        </div>
                    </div>

                    {/* Attachments */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Attachments</label>
                            {canEditTask && currentUser.role === UserRole.MANAGER && (
                                <label className="text-xs text-blue-600 cursor-pointer hover:underline font-medium">
                                    + Add
                                    <input type="file" multiple className="hidden" onChange={handleDetailFileUpload} />
                                </label>
                            )}
                        </div>
                        <div className="space-y-2">
                           {selectedTask.attachments?.map((file, idx) => (
                              <div key={idx} className="flex items-center p-2 bg-white border border-slate-200 rounded-lg group hover:border-blue-300 transition-colors">
                                 <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 mr-2 cursor-pointer" onClick={() => handleDownloadAttachment(file)}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                 </div>
                                 <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleDownloadAttachment(file)}>
                                    <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                                    <p className="text-xs text-slate-400 uppercase">{file.type}</p>
                                 </div>
                                 <div className="flex gap-1">
                                     <button onClick={(e) => { e.stopPropagation(); handleDownloadAttachment(file); }} className="p-1 text-slate-400 hover:text-blue-600 rounded">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                     </button>
                                     {canEditTask && currentUser.role === UserRole.MANAGER && (
                                         <button onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(idx); }} className="p-1 text-slate-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                         </button>
                                     )}
                                 </div>
                              </div>
                           ))}
                           {(!selectedTask.attachments || selectedTask.attachments.length === 0) && (
                              <div className="text-xs text-slate-400 italic text-center py-2 border border-dashed border-slate-200 rounded">No attachments</div>
                           )}
                        </div>
                    </div>

                    {/* Actions Area */}
                    {canEditTask && (
                      <div className="mt-auto pt-6 border-t border-slate-200 space-y-3">
                           {/* ESCALATION SECTION */}
                           {currentUser.role === UserRole.AGENT && selectedTask.status !== TaskStatus.DONE && (
                               <div className="border-b border-slate-100 pb-3 mb-2">
                                   {showEscalationInput ? (
                                      <div className="bg-red-50 p-3 rounded-lg border border-red-100 animate-fadeIn">
                                          <label className="text-xs font-bold text-red-700 uppercase mb-2 block">Escalate to Manager</label>
                                          <input
                                              type="text"
                                              className="w-full text-xs p-2 border border-red-200 rounded mb-2 focus:ring-red-500 focus:border-red-500"
                                              placeholder="Link to item/issue (Optional)"
                                              value={escalationLink}
                                              onChange={e => setEscalationLink(e.target.value)}
                                          />
                                          <textarea
                                              autoFocus
                                              className="w-full text-xs p-2 border border-red-200 rounded mb-2 h-20 focus:ring-red-500 focus:border-red-500"
                                              placeholder="Explain why you are escalating this product/task..."
                                              value={escalationReason}
                                              onChange={e => setEscalationReason(e.target.value)}
                                          />
                                          <div className="flex gap-2">
                                              <Button variant="danger" className="text-xs py-1 flex-1" onClick={handleConfirmEscalation}>Confirm Escalation</Button>
                                              <Button variant="secondary" className="text-xs py-1" onClick={() => setShowEscalationInput(false)}>Cancel</Button>
                                          </div>
                                      </div>
                                   ) : (
                                      <button 
                                          onClick={() => setShowEscalationInput(true)}
                                          className="w-full py-2 text-xs font-bold text-red-600 hover:bg-red-50 border border-dashed border-red-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                                      >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                          Escalate Issue to Manager
                                      </button>
                                   )}
                               </div>
                           )}

                           {/* Complete Button Logic */}
                           {selectedTask.status === TaskStatus.IN_PROGRESS && (
                              isAutomatedTask(selectedTask.type) ? (
                                 <div className="bg-slate-100 p-2 rounded text-center text-xs text-slate-500">
                                    Auto-completes via Inventory
                                 </div>
                              ) : selectedTask.type === TaskType.INVOICE_PROCESSING ? (
                                  <div className="bg-slate-100 p-2 rounded text-center text-xs text-slate-500">
                                     Upload Final CSV in Studio Invoice to complete
                                  </div>
                              ) : hasActiveEscalations ? (
                                  <div className="bg-red-50 border border-red-200 p-2 rounded text-center">
                                      <span className="text-xs text-red-600 font-bold block mb-1">
                                          Blocked by Escalation
                                      </span>
                                      <span className="text-[10px] text-red-500">
                                          Please ensure all escalation threads are closed before completing.
                                      </span>
                                  </div>
                              ) : (
                                 <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20" onClick={() => handleStatusChange(selectedTask, TaskStatus.DONE)}>
                                    Mark Complete
                                 </Button>
                              )
                           )}

                           {/* Start Button Logic */}
                           {selectedTask.status === TaskStatus.TODO && (
                              <Button className="w-full" onClick={() => handleStatusChange(selectedTask, TaskStatus.IN_PROGRESS)}>Start Working</Button>
                           )}

                           {/* Hold / Delete Controls */}
                           <div className="flex gap-2 justify-center">
                              {showHoldInput ? (
                                 <div className="flex flex-col gap-2 w-full animate-fadeIn">
                                    <input 
                                       autoFocus
                                       type="text" 
                                       placeholder="Reason..." 
                                       className="border border-amber-300 rounded px-2 py-1 text-xs w-full"
                                       onKeyDown={(e) => e.key === 'Enter' && handleStatusChange(selectedTask, TaskStatus.ON_HOLD, (e.target as HTMLInputElement).value)}
                                    />
                                    <div className="flex gap-2">
                                       <Button className="flex-1 text-xs py-1" variant="secondary" onClick={() => setShowHoldInput(false)}>Cancel</Button>
                                       <Button className="flex-1 text-xs py-1 bg-amber-500 text-white" onClick={(e) => {
                                           const input = (e.currentTarget.parentElement?.previousSibling as HTMLInputElement).value;
                                           if(input) handleStatusChange(selectedTask, TaskStatus.ON_HOLD, input);
                                       }}>Hold</Button>
                                    </div>
                                  </div>
                              ) : (
                                 selectedTask.status !== TaskStatus.DONE && (
                                   <button onClick={() => setShowHoldInput(true)} className="flex-1 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg transition-colors">
                                      Put On Hold
                                   </button>
                                 )
                              )}

                              {currentUser.role === UserRole.MANAGER && (
                                  showDeleteConfirm ? (
                                      <div className="flex gap-1 items-center flex-1 animate-fadeIn">
                                          <Button variant="danger" className="text-xs px-2 py-2 flex-1" onClick={handleConfirmDelete}>Confirm</Button>
                                          <Button variant="secondary" className="text-xs px-2 py-2" onClick={() => setShowDeleteConfirm(false)}>X</Button>
                                      </div>
                                  ) : (
                                      <button onClick={() => { setShowDeleteConfirm(true); setShowHoldInput(false); }} className="flex-1 py-2 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors">
                                         Delete
                                      </button>
                                  )
                              )}
                           </div>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ESCALATION CHAT MODAL */}
      {activeEscalationForChat && (
          <EscalationModal 
            escalation={activeEscalationForChat}
            currentUser={currentUser}
            onClose={() => setActiveEscalationForChat(null)}
            onReply={handleEscalationReply}
            onResolveClose={handleAgentClose}
          />
      )}

      {/* Create Task Modal - Simplified for brevity in this redesign, keeping function */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                   <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={newTaskType} onChange={e => setNewTaskType(e.target.value as TaskType)}>
                     {Object.values(TaskType).map(t => <option key={t} value={t}>{getTypeLabel(t)}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                   <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as TaskPriority)}>
                     {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} />
              </div>
              
              {/* Tags Selector */}
              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-2">Tags</label>
                 <div className="flex flex-wrap gap-2">
                   {AVAILABLE_TAGS.map(tag => (
                     <button
                       type="button"
                       key={tag}
                       onClick={() => toggleTag(tag)}
                       className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                         newTaskTags.includes(tag) 
                           ? 'bg-blue-100 text-blue-700 border-blue-200' 
                           : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                       }`}
                     >
                       {tag}
                     </button>
                   ))}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Assignee</label>
                   <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)}>
                     {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                   <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} />
                </div>
              </div>

              {currentUser.role === UserRole.MANAGER && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Attachments</label>
                   <input type="file" multiple onChange={handleFileSelect} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                   {newTaskAttachments.length > 0 && (
                     <p className="mt-2 text-xs text-slate-500">{newTaskAttachments.length} files selected</p>
                   )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button type="submit">Create Task</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;
