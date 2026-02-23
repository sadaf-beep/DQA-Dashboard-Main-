
import React, { useMemo, useState, useEffect } from 'react';
import { Task, User, InventoryFile, InventoryStatus, TaskStatus, Escalation, UserRole } from '../types';
import DashboardTracker from './DashboardTracker';
import { EscalationModal } from './EscalationModal';

interface DashboardViewProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  inventories: InventoryFile[];
  escalations: Escalation[];
  onUpdateTask: (task: Task) => void;
  onResolveEscalation: (escalation: Escalation, message: string) => void;
  onCloseEscalation: (escalation: Escalation) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ tasks, users, currentUser, inventories, escalations, onUpdateTask, onResolveEscalation, onCloseEscalation }) => {
  const [activeEscalation, setActiveEscalation] = useState<Escalation | null>(null);

  // Sync the currently open escalation modal with updates from the parent prop
  useEffect(() => {
    if (activeEscalation) {
        const fresh = escalations.find(e => e.id === activeEscalation.id);
        if (fresh && JSON.stringify(fresh.history) !== JSON.stringify(activeEscalation.history)) {
            setActiveEscalation(fresh);
        }
    }
  }, [escalations, activeEscalation]);

  const statusCounts = useMemo(() => {
    return {
        todo: tasks.filter(t => t.status === TaskStatus.TODO).length,
        inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        onHold: tasks.filter(t => t.status === TaskStatus.ON_HOLD).length,
        done: tasks.filter(t => t.status === TaskStatus.DONE).length
    };
  }, [tasks]);

  const agentStats = useMemo(() => {
    const stats: Record<string, { totalTasks: number; activeTasks: number; productsProcessed: number; avgTurnaround: number }> = {};
    users.forEach(u => {
      stats[u.id] = { totalTasks: 0, activeTasks: 0, productsProcessed: 0, avgTurnaround: 0 };
    });
    tasks.forEach(t => {
      if (stats[t.assigneeId]) {
        if (t.status === TaskStatus.DONE) {
            stats[t.assigneeId].totalTasks++;
            if (t.completedAt && t.createdAt) {
                const currentAvg = stats[t.assigneeId].avgTurnaround;
                const count = stats[t.assigneeId].totalTasks;
                const durationHours = (t.completedAt - t.createdAt) / 3600000;
                if (count === 1) stats[t.assigneeId].avgTurnaround = durationHours;
                else stats[t.assigneeId].avgTurnaround = ((currentAvg * (count - 1)) + durationHours) / count;
            }
        } else {
            stats[t.assigneeId].activeTasks++;
        }
      }
    });
    inventories.forEach(inv => {
      inv.data.forEach(item => {
        if (item.assigneeId && stats[item.assigneeId]) {
          if (item.status === InventoryStatus.QA_COMPLETE || item.status === InventoryStatus.AUGMENTED) {
            stats[item.assigneeId].productsProcessed++;
          }
        }
      });
    });
    return stats;
  }, [tasks, users, inventories]);

  const activeEscalations = useMemo(() => {
     return escalations.filter(e => e.status !== 'CLOSED');
  }, [escalations]);

  const handleEscalationReply = (message: string) => {
      if (activeEscalation) onResolveEscalation(activeEscalation, message);
  };

  const handleEscalationClose = () => {
      if (activeEscalation) {
          onCloseEscalation(activeEscalation);
          setActiveEscalation(null);
      }
  };

  return (
    <div className="flex flex-col h-full space-y-6 pb-8">
       <div className="flex justify-between items-center mb-1">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
            <p className="text-sm text-slate-500">Overview of team performance and task status.</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
               <div>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">To Do</p>
                   <p className="text-2xl font-bold text-slate-800">{statusCounts.todo}</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
               </div>
           </div>
           <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between">
               <div>
                   <p className="text-xs font-bold text-blue-500 uppercase tracking-wide">In Progress</p>
                   <p className="text-2xl font-bold text-blue-700">{statusCounts.inProgress}</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               </div>
           </div>
           <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between">
               <div>
                   <p className="text-xs font-bold text-amber-500 uppercase tracking-wide">On Hold</p>
                   <p className="text-2xl font-bold text-amber-700">{statusCounts.onHold}</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
           </div>
           <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
               <div>
                   <p className="text-xs font-bold text-emerald-500 uppercase tracking-wide">Completed</p>
                   <p className="text-2xl font-bold text-emerald-700">{statusCounts.done}</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               </div>
           </div>
       </div>

       <div className="w-full">
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-5 flex flex-col">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <div className="p-1.5 bg-red-100 rounded text-red-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 Active Escalations
               </h3>
               <span className="text-xs font-bold bg-red-500 text-white px-2 py-1 rounded-full">{activeEscalations.length}</span>
             </div>
             <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-1 custom-scrollbar">
                {activeEscalations.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic text-sm">No active escalations.</div>
                ) : (
                  activeEscalations.map(esc => (
                    <div key={esc.id} className="p-3 bg-red-50 border border-red-100 rounded-lg flex justify-between items-center cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setActiveEscalation(esc)}>
                       <div className="flex-1 min-w-0 mr-4">
                          <p className="text-sm font-bold text-slate-800 truncate">{esc.taskTitle}</p>
                          <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-red-600 flex items-center gap-1">
                                  {esc.status === 'PENDING' ? 'Waiting on Manager' : 'Response Sent'}
                                  {esc.status === 'PENDING' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                              </p>
                              <span className="text-[10px] text-slate-400">•</span>
                              <p className="text-xs text-slate-500 truncate max-w-md italic">"{esc.history[esc.history.length-1].text}"</p>
                          </div>
                       </div>
                       <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-slate-600">{esc.agentName}</p>
                          <span className="text-[10px] text-blue-600 underline">View Discussion</span>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
       </div>

       {currentUser.role === UserRole.MANAGER && (
         <div>
           <div className="flex justify-between items-center mb-3">
               <h3 className="text-lg font-bold text-slate-800">Agent Performance Overview</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {users.filter(u => u.role !== 'MANAGER').map(u => {
                const stats = agentStats[u.id];
                return (
                  <div key={u.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 relative group">
                     <div className="flex items-center gap-4">
                        <div className="relative">
                           {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full border border-slate-200" />
                           ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">{u.name.charAt(0)}</div>
                           )}
                           <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${stats.activeTasks > 0 ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-bold text-slate-800 truncate">{u.name}</h4>
                           <p className="text-xs text-slate-500 truncate">{u.country || 'Unknown Location'}</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                        <div className="text-center">
                             <span className="block text-sm font-bold text-slate-800">{stats.activeTasks}</span>
                             <span className="block text-[10px] text-slate-400">Tasks</span>
                        </div>
                        <div className="text-center border-l border-slate-100">
                             <span className="block text-sm font-bold text-slate-800">{stats.productsProcessed}</span>
                             <span className="block text-[10px] text-slate-400">Prods</span>
                        </div>
                        <div className="text-center border-l border-slate-100">
                             <span className="block text-sm font-bold text-slate-800">{stats.avgTurnaround.toFixed(1)}h</span>
                             <span className="block text-[10px] text-slate-400">Avg Time</span>
                        </div>
                     </div>
                  </div>
                );
              })}
           </div>
         </div>
       )}

       <div className="flex-1 min-h-[500px]">
          <DashboardTracker tasks={tasks} users={users} onUpdateTask={onUpdateTask} />
       </div>

       {activeEscalation && (
           <EscalationModal 
               escalation={activeEscalation}
               currentUser={currentUser}
               onClose={() => setActiveEscalation(null)}
               onReply={handleEscalationReply}
               onResolveClose={handleEscalationClose}
           />
       )}
    </div>
  );
};

export default DashboardView;
