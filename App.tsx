
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TaskBoard from './components/TaskBoard';
import InventoryManager from './components/InventoryManager';
import InvoiceManager from './components/InvoiceManager';
import DashboardView from './components/DashboardView';
import AgentManagement from './components/AgentManagement';
import OperationalAnalytics from './components/OperationalAnalytics';
import ProfileSettings from './components/ProfileSettings';
import Login from './components/Login';
import NotificationToast from './components/NotificationToast'; // New Component
import { User, Task, InventoryFile, UserRole, Notification, Invoice, Escalation, EscalationMessage, TaskStatus, TaskType, InventoryStatus, TaskPriority, InventoryItem } from './types';
import { storageService } from './services/storageService';

// Audio Context Singleton
let audioCtx: AudioContext | null = null;

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    // Initialize only once
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    
    // Resume if suspended (common browser policy restriction)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(err => console.error("Audio resume failed", err));
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    // Friendly "Ding" - C5 to A5
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
    
    // Fade out
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

const App: React.FC = () => {
  // State initialization (Empty by default, populated via subscriptions)
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => storageService.getUserSession());
  const [isAppLoading, setIsAppLoading] = useState(true); // Loading state for initial data fetch
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'>('CONNECTING');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inventories, setInventories] = useState<InventoryFile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Refs for change detection (Notification Logic)
  const prevTasksRef = useRef<Task[]>([]);
  const prevInvoicesRef = useRef<Invoice[]>([]);
  const prevEscalationsRef = useRef<Escalation[]>([]);
  const isFirstLoad = useRef(true);

  // --- REAL-TIME DATA SUBSCRIPTIONS ---
  useEffect(() => {
    // Listen for connection changes
    storageService.onConnectionChange(setConnectionStatus);

    // We wrap the user subscription to unset the loading flag once we get data (or error)
    const unsubUsers = storageService.subscribeUsers((data) => {
        setUsers(data);
        setIsAppLoading(false);
    });

    const unsubTasks = storageService.subscribeTasks(setTasks);
    const unsubInv = storageService.subscribeInventories(setInventories);
    const unsubInvoices = storageService.subscribeInvoices(setInvoices);
    const unsubEsc = storageService.subscribeEscalations(setEscalations);

    return () => {
      unsubUsers();
      unsubTasks();
      unsubInv();
      unsubInvoices();
      unsubEsc();
    };
  }, []);

  // Sync currentUser profile if updated in remote DB
  useEffect(() => {
    if (currentUser) {
       const freshUser = users.find(u => u.id === currentUser.id);
       if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
          setCurrentUser(freshUser);
          storageService.setUserSession(freshUser, true); 
       }
    }
  }, [users, currentUser]);

  // --- SLACK INTEGRATION HELPER ---
  const sendToSlack = async (message: string) => {
    const webhookUrl = localStorage.getItem('dqa_slack_webhook');
    if (!webhookUrl) return;

    try {
        // 'no-cors' mode is required for calling Slack webhooks from a browser 
        // to prevent CORS errors, although we cannot read the response (opaque).
        await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message })
        });
    } catch (error) {
        console.error("Failed to send Slack notification:", error);
    }
  };

  // --- NOTIFICATION & DETECTION LOGIC ---
  useEffect(() => {
    if (isFirstLoad.current) {
        if (tasks.length > 0 || invoices.length > 0) {
            prevTasksRef.current = tasks;
            prevInvoicesRef.current = invoices;
            prevEscalationsRef.current = escalations;
            isFirstLoad.current = false;
        }
        return;
    }

    if (!currentUser) return;

    // 1. Detect Task Changes
    tasks.forEach(newTask => {
        const oldTask = prevTasksRef.current.find(t => t.id === newTask.id);
        
        // A) New Task Assigned
        if (!oldTask) {
            // If I am the assignee OR I am a manager (monitor all)
            if (newTask.assigneeId === currentUser.id || currentUser.role === UserRole.MANAGER) {
                addNotification("New Task Assigned", `Task "${newTask.title}" assigned to ${users.find(u=>u.id===newTask.assigneeId)?.name || 'someone'}.`, true);
            }
        } 
        // B) Status Change
        else if (oldTask.status !== newTask.status) {
            // Notify if I am assignee, I am manager, OR I was the assignee
            if (newTask.assigneeId === currentUser.id || currentUser.role === UserRole.MANAGER) {
                const isComplete = newTask.status === TaskStatus.DONE;
                addNotification(
                    isComplete ? "Task Completed" : "Task Updated", 
                    `"${newTask.title}" moved to ${newTask.status.replace('_', ' ')}.`,
                    true
                );
            }
        }
    });

    // 2. Detect Invoice Changes
    invoices.forEach(newInv => {
        const oldInv = prevInvoicesRef.current.find(i => i.id === newInv.id);
        
        // A) New Invoice (or newly loaded)
        if (!oldInv) {
             if (newInv.assigneeId === currentUser.id || currentUser.role === UserRole.MANAGER) {
                 addNotification("New Invoice Slot", `Invoice "${newInv.referenceName}" created.`, true);
             }
        }
        // B) Invoice Completed by Agent (Critical for Manager)
        else {
             if (oldInv.status !== 'COMPLETED' && newInv.status === 'COMPLETED') {
                 if (currentUser.role === UserRole.MANAGER) {
                     const msg = `✅ Invoice Completed: "${newInv.referenceName}" by ${newInv.assigneeName}. Ready for upload.`;
                     addNotification("Invoice Ready", msg, true);
                     sendToSlack(msg);
                 }
             }
             if (oldInv.status !== newInv.status && newInv.status !== 'COMPLETED') {
                 if (newInv.assigneeId === currentUser.id || currentUser.role === UserRole.MANAGER) {
                     addNotification("Invoice Status", `"${newInv.referenceName}" is now ${newInv.status}.`, true);
                 }
             }
        }
    });

    // 3. Detect Escalations
    escalations.forEach(newEsc => {
        const oldEsc = prevEscalationsRef.current.find(e => e.id === newEsc.id);
        if (!oldEsc) {
            // New Escalation (Critical)
            if (currentUser.role === UserRole.MANAGER || newEsc.agentId === currentUser.id) {
                const msg = `🚨 Escalation Raised: "${newEsc.taskTitle}" by ${newEsc.agentName}.`;
                addNotification("Escalation Raised", msg, true);
                if (currentUser.role !== UserRole.MANAGER) sendToSlack(msg); // If agent raises it, alert slack
            }
        } else if (oldEsc.status !== newEsc.status) {
            // Status changed (e.g. Resolved)
            if (currentUser.role === UserRole.MANAGER || newEsc.agentId === currentUser.id) {
                addNotification("Escalation Update", `Escalation for "${newEsc.taskTitle}" is ${newEsc.status}.`, true);
            }
        } else if (newEsc.history.length > oldEsc.history.length) {
            // New message in escalation
            const lastMsg = newEsc.history[newEsc.history.length - 1];
            if (lastMsg.authorId !== currentUser.id) {
                 addNotification("New Message", `New reply in escalation for "${newEsc.taskTitle}".`, true);
            }
        }
    });

    // Update refs
    prevTasksRef.current = tasks;
    prevInvoicesRef.current = invoices;
    prevEscalationsRef.current = escalations;

  }, [tasks, invoices, escalations, currentUser, users]);


  // --- AUTOMATED TASK COMPLETION LOGIC ---
  useEffect(() => {
    if (tasks.length === 0 || inventories.length === 0) return;

    tasks.forEach(task => {
      if (task.status === TaskStatus.DONE) return;
      if (!task.inventoryFileId || !task.inventoryItemIds || task.inventoryItemIds.length === 0) return;
      
      const hasActiveEscalation = escalations.some(e => e.taskId === task.id && e.status !== 'CLOSED');
      if (hasActiveEscalation) return;

      const inventory = inventories.find(inv => inv.id === task.inventoryFileId);
      if (!inventory) return;

      const relevantItems = inventory.data.filter(item => task.inventoryItemIds?.includes(item.id));
      if (relevantItems.length === 0) return;

      const allItemsComplete = relevantItems.every(item => {
          if (task.type === TaskType.QA) {
            return item.status === InventoryStatus.QA_COMPLETE;
          }
          return item.status === InventoryStatus.AUGMENTED || item.status === InventoryStatus.QA_COMPLETE;
      });

      if (allItemsComplete) {
        const updatedTask = { ...task, status: TaskStatus.DONE, completedAt: Date.now() };
        storageService.updateTask(updatedTask);
        // Note: The main useEffect above will catch this change and notify the user
      }
    });
  }, [tasks, inventories, escalations]);

  // --- STORAGE CALCULATOR (Resource Monitoring) ---
  const storageUsageMB = useMemo(() => {
     // Estimate JSON string size of all major data stores
     const tasksSize = JSON.stringify(tasks).length;
     const invSize = JSON.stringify(inventories).length;
     const invFilesSize = JSON.stringify(invoices).length; // Heaviest due to base64
     const escSize = JSON.stringify(escalations).length;
     
     const totalBytes = tasksSize + invSize + invFilesSize + escSize;
     const totalMB = totalBytes / (1024 * 1024);
     
     return Number(totalMB.toFixed(2));
  }, [tasks, inventories, invoices, escalations]);

  const addNotification = (title: string, message: string, playSound: boolean = false) => {
    const newNotif: Notification = { id: `notif-${Date.now()}-${Math.random()}`, title, message, read: false, timestamp: Date.now() };
    setNotifications(prev => [newNotif, ...prev]);
    if (playSound) playNotificationSound();
  };

  const dismissNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- HANDLERS ---
  
  const handleManualRefresh = async () => {
    const data = await storageService.fetchAllData();
    setUsers(data.users);
    setTasks(data.tasks);
    setInventories(data.inventories);
    setInvoices(data.invoices);
    setEscalations(data.escalations);
    addNotification("System", "Data synchronized with server.");
  };

  const handleLoginSuccess = (user: User, remember: boolean = true) => {
    setCurrentUser(user);
    storageService.setUserSession(user, remember);
  };

  const handleUserUpdateForLogin = async (updatedUser: User) => {
    const { error } = await storageService.saveUser(updatedUser);
    if (error) {
        alert("Failed to update user password. Please check your connection.");
        return;
    }
    handleLoginSuccess(updatedUser, true);
  };

  const handleUserRegister = async (newUser: User) => {
    const { error } = await storageService.saveUser(newUser);
    if (error) {
        console.error(error);
        alert("Failed to create account. Please check your internet connection or API Key configuration.");
        return;
    }
    handleLoginSuccess(newUser, true);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    storageService.updateTask(updatedTask);
  };

  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = { ...taskData, id: Date.now().toString(), createdAt: Date.now() };
    storageService.addTask(newTask);
    // Notification handled by change detector to ensure everyone gets it
  };

  const handleDeleteTask = (taskId: string) => {
    // Optimistic update: Remove from UI immediately
    setTasks(prev => prev.filter(t => t.id !== taskId));
    storageService.deleteTask(taskId);
  };

  const handleInventoryUpload = (file: InventoryFile) => {
    storageService.saveInventoryFile(file);
  };

  const handleInventoryDelete = (fileId: string) => {
    storageService.deleteInventoryFile(fileId);
  };

  const handleInventoryItemsUpdate = (fileId: string, items: InventoryItem[]) => {
    storageService.updateInventoryItems(fileId, items);
  };

  const handleAddAgent = (user: User) => storageService.saveUser(user);
  const handleUpdateAgent = (user: User) => storageService.saveUser(user);
  const handleRemoveAgent = (id: string) => storageService.deleteUser(id);

  const handleAddInvoice = (newInvoice: Invoice) => {
    storageService.saveInvoice(newInvoice);
    const newTask: Task = {
      id: `task-${newInvoice.id}`,
      title: `Process Invoice: ${newInvoice.referenceName}`,
      description: `Invoice processing task created for ${newInvoice.referenceName}. Link to invoice ID: ${newInvoice.id}`,
      assigneeId: newInvoice.assigneeId || '',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      type: TaskType.INVOICE_PROCESSING,
      dueDate: newInvoice.dueDate || new Date(Date.now() + 3 * 86400000).toISOString(),
      createdAt: Date.now(),
      tags: ['Invoice', 'Administrative'],
      attachments: [{ name: newInvoice.pdfFile.name, type: 'pdf', url: '#' }]
    };
    storageService.addTask(newTask);
    // Notifications handled by change detector
  };

  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
    const oldInvoice = invoices.find(i => i.id === updatedInvoice.id);
    storageService.saveInvoice(updatedInvoice);

    const linkedTask = tasks.find(t => t.id === `task-${updatedInvoice.id}`);
    if (linkedTask) {
        const newTaskState = {
            ...linkedTask,
            assigneeId: updatedInvoice.assigneeId || linkedTask.assigneeId,
            dueDate: updatedInvoice.dueDate || linkedTask.dueDate,
            status: (updatedInvoice.status === 'COMPLETED' || updatedInvoice.status === 'UPLOADED') ? TaskStatus.DONE : linkedTask.status
        };
        storageService.updateTask(newTaskState);
    }

    if (oldInvoice?.status !== 'COMPLETED' && updatedInvoice.status === 'COMPLETED') {
         const manager = users.find(u => u.role === UserRole.MANAGER);
         if (manager) {
             const managerTask: Task = {
                id: `task-mgr-${updatedInvoice.id}`,
                title: `Upload to Beam: ${updatedInvoice.referenceName}`,
                description: `The invoice ${updatedInvoice.referenceName} has been processed by the agent. Please upload the final deliverable to Beam Dynamics and confirm in the Studio Invoice tab.`,
                assigneeId: manager.id,
                status: TaskStatus.TODO,
                priority: TaskPriority.HIGH,
                type: TaskType.INVOICE_PROCESSING,
                dueDate: new Date(Date.now() + 86400000).toISOString(),
                createdAt: Date.now(),
                tags: ['Manager Action', 'Upload', 'Invoice'],
                attachments: updatedInvoice.finalCsvFile ? [{ name: updatedInvoice.finalCsvFile.name, type: 'csv', url: '#' }] : []
             };
             storageService.addTask(managerTask);
         }
    }

    if (updatedInvoice.status === 'UPLOADED') {
         const mgrTask = tasks.find(t => t.id === `task-mgr-${updatedInvoice.id}`);
         if (mgrTask) {
             storageService.updateTask({ ...mgrTask, status: TaskStatus.DONE, completedAt: Date.now() });
         }
    }
  };

  const handleDeleteInvoice = (id: string) => {
    storageService.deleteInvoice(id);
    const t1 = tasks.find(t => t.id === `task-${id}`);
    const t2 = tasks.find(t => t.id === `task-mgr-${id}`);
    if (t1) storageService.deleteTask(t1.id);
    if (t2) storageService.deleteTask(t2.id);
  };

  const handleEscalateTask = (task: Task, reason: string, link?: string) => {
    if (!currentUser) return;
    const initialMessage: EscalationMessage = { id: `msg-${Date.now()}`, authorId: currentUser.id, authorName: currentUser.name, role: currentUser.role, text: reason, timestamp: Date.now() };
    const escalation: Escalation = { id: `esc-${Date.now()}`, taskId: task.id, taskTitle: task.title, agentId: currentUser.id, agentName: currentUser.name, link, history: [initialMessage], status: 'PENDING', createdAt: Date.now(), updatedAt: Date.now() };
    storageService.saveEscalation(escalation);
    storageService.updateTask({ ...task, isEscalated: true });
    // Notification handled by change detector
  };

  const handleEscalationReply = (esc: Escalation, messageText: string) => {
    if (!currentUser) return;
    const newMessage: EscalationMessage = { id: `msg-${Date.now()}`, authorId: currentUser.id, authorName: currentUser.name, role: currentUser.role, text: messageText, timestamp: Date.now() };
    const newStatus = currentUser.role === UserRole.MANAGER ? 'RESPONDED' : 'PENDING';
    const updatedEsc = { ...esc, history: [...esc.history, newMessage], status: newStatus as any, updatedAt: Date.now() };
    storageService.saveEscalation(updatedEsc);
  };

  const handleCloseEscalation = (esc: Escalation) => {
    const updatedEsc = { ...esc, status: 'CLOSED' as const, updatedAt: Date.now() };
    storageService.saveEscalation(updatedEsc);
    const task = tasks.find(t => t.id === esc.taskId);
    if (task) storageService.updateTask({ ...task, isEscalated: false });
  };

  const handleLogout = () => {
    storageService.clearUserSession();
    setCurrentUser(null);
  };

  // --- RENDERING ---

  if (isAppLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
         <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-500 font-medium">Connecting to DQA System...</p>
         </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
       <Login 
          users={users} 
          onLogin={handleLoginSuccess} 
          onUpdateUser={handleUserUpdateForLogin} 
          onRegister={handleUserRegister} 
       />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar 
         user={currentUser} 
         activeTab={activeTab} 
         onTabChange={setActiveTab} 
         onLogout={handleLogout} 
         connectionStatus={connectionStatus}
         storageUsageMB={storageUsageMB}
         onRefresh={handleManualRefresh}
         unreadCount={notifications.length}
      />
      <main className="flex-1 ml-64 p-8 h-screen overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto w-full pb-8">
          {activeTab === 'dashboard' && <DashboardView tasks={tasks} users={users} currentUser={currentUser} inventories={inventories} escalations={escalations} onUpdateTask={handleTaskUpdate} onResolveEscalation={handleEscalationReply} onCloseEscalation={handleCloseEscalation} />}
          {activeTab === 'tasks' && <TaskBoard tasks={tasks} users={users} currentUser={currentUser} onAddTask={handleAddTask} onUpdateTask={handleTaskUpdate} onDeleteTask={handleDeleteTask} onEscalateTask={handleEscalateTask} escalations={escalations} onResolveEscalation={handleEscalationReply} onCloseEscalation={handleCloseEscalation} />}
          {activeTab === 'inventory' && <InventoryManager inventories={inventories} currentUser={currentUser} users={users} onUpload={handleInventoryUpload} onDeleteFile={handleInventoryDelete} onUpdateItems={handleInventoryItemsUpdate} onAddTask={handleAddTask} />}
          {activeTab === 'analytics' && currentUser.role === UserRole.MANAGER && <OperationalAnalytics tasks={tasks} inventories={inventories} invoices={invoices} users={users} />}
          {activeTab === 'invoices' && (
            <InvoiceManager 
              invoices={invoices} 
              currentUser={currentUser} 
              users={users}
              onAddInvoice={handleAddInvoice} 
              onUpdateInvoice={handleUpdateInvoice} 
              onDeleteInvoice={handleDeleteInvoice} 
            />
          )}
          {activeTab === 'agent-management' && currentUser.role === UserRole.MANAGER && (
            <AgentManagement 
              users={users} 
              currentUser={currentUser} 
              tasks={tasks} 
              inventories={inventories} 
              onAddUser={handleAddAgent}
              onUpdateUser={handleUpdateAgent}
              onRemoveUser={handleRemoveAgent}
            />
          )}
          {activeTab === 'onboarding' && (
            <div className="flex-1 h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <iframe src="https://beamdynamics.retool.com/embedded/public/2c7c775f-0c10-4fb2-ab48-c513d2d82497" className="w-full h-full border-0" title="Onboarding Alert" />
            </div>
          )}
          {activeTab === 'profile' && (
             <ProfileSettings user={currentUser} onUpdateUser={handleUpdateAgent} />
          )}
        </div>
      </main>
      
      {/* Toast Notifications Overlay */}
      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
};

export default App;
