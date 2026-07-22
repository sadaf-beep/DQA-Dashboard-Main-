
import React, { useState, useEffect } from 'react';
import { User, UserRole, Task, TaskStatus, TaskType, InventoryFile } from '../types';
import { Button, Card, Badge } from './Common';
import { generateId } from '../services/id';

interface AgentManagementProps {
  users: User[];
  currentUser: User;
  tasks: Task[];
  inventories: InventoryFile[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onRemoveUser: (userId: string) => void;
}

const AgentManagement: React.FC<AgentManagementProps> = ({ users, currentUser, tasks, inventories, onAddUser, onUpdateUser, onRemoveUser }) => {
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});

  // Keep selectedAgent in sync with the users prop if it's updated externally
  useEffect(() => {
    if (selectedAgent) {
      const updated = users.find(u => u.id === selectedAgent.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedAgent)) {
        if (!isEditing) {
          setSelectedAgent(updated);
        }
      }
    }
  }, [users, selectedAgent?.id, isEditing]);

  // When an agent is selected, initialize the form data with their current info
  useEffect(() => {
    if (selectedAgent && selectedAgent.id) {
      setFormData({ ...selectedAgent });
    } else if (isAddingNew) {
      setFormData({ name: '', role: UserRole.AGENT, country: '', payRate: 0, email: '', phone: '', address: '' });
    }
  }, [selectedAgent, isAddingNew]);

  const calculateMetrics = (userId: string) => {
    const userTasks = tasks.filter(t => t.assigneeIds.includes(userId));
    const completedTasks = userTasks.filter(t => t.status === TaskStatus.DONE);
    const augmentCount = completedTasks.filter(t => t.type === TaskType.AUGMENTING).length;
    const qaCount = completedTasks.filter(t => t.type === TaskType.QA).length;
    const activeTasksCount = userTasks.filter(t => t.status !== TaskStatus.DONE).length;
    
    return { augmentCount, qaCount, activeTasksCount, total: userTasks.length };
  };

  const handleSave = () => {
    if (isAddingNew) {
      const newUser: User = {
        id: generateId('u'),
        username: (formData.name || 'user').toLowerCase().split(' ')[0] + Math.floor(Math.random() * 1000),
        role: UserRole.AGENT,
        joiningDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
        ...formData
      } as User;
      onAddUser(newUser);
      setIsAddingNew(false);
    } else if (selectedAgent && formData) {
      onUpdateUser({ ...selectedAgent, ...formData } as User);
    }
    setIsEditing(false);
    setSelectedAgent(null);
  };

  const handleDelete = () => {
    if (selectedAgent && selectedAgent.id && !isAddingNew) {
      setIsDeleteModalOpen(true);
    }
  };

  const confirmDelete = () => {
    if (selectedAgent && selectedAgent.id) {
       onRemoveUser(selectedAgent.id);
       setSelectedAgent(null);
       setIsEditing(false);
       setIsDeleteModalOpen(false);
    }
  };

  const handleOpenEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (isAddingNew) {
      setSelectedAgent(null);
      setIsAddingNew(false);
      setIsEditing(false);
    } else {
      setIsEditing(false);
      if (selectedAgent) setFormData({ ...selectedAgent });
    }
  };

  const handleCardClick = (user: User) => {
    setIsAddingNew(false);
    setIsEditing(false);
    setSelectedAgent(user);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 tracking-tight">DQA Agent</h2>
           <p className="text-slate-500 text-sm mt-0.5">Manage team profiles, rates, and workloads.</p>
        </div>
        <Button onClick={() => { 
          setIsAddingNew(true);
          setIsEditing(true);
          setSelectedAgent({} as User); 
        }} className="shadow-lg shadow-blue-500/20 px-5 py-2 text-sm">
            + Add New Agent
        </Button>
      </div>

      {/* Grid of Agent Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto pb-6 pr-2 custom-scrollbar flex-1">
        {users.map(user => {
            const metrics = calculateMetrics(user.id);
            const isMe = user.id === currentUser.id;
            return (
                <div 
                    key={user.id} 
                    className="bg-white rounded-xl border border-blue-400/20 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md cursor-pointer h-fit"
                    onClick={() => handleCardClick(user)}
                >
                    <div className="pt-6 pb-4 flex flex-col items-center border-b border-slate-50 relative">
                        <div className="relative mb-3">
                            {user.avatar ? (
                                <img src={user.avatar} className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold border-2 border-white shadow-sm">
                                    {user.name?.charAt(0) || '?'}
                                </div>
                            )}
                            {isMe && (
                                <div className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[8px] font-black px-1 py-0.5 rounded-md border border-white shadow-sm">
                                    YOU
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mb-1">{user.name}</h3>
                        <div className={`text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest ${
                          user.role === UserRole.MANAGER 
                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                           {user.role}
                        </div>
                    </div>
                    
                    <div className="p-4 flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-slate-500">
                           <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                           <span className="text-[11px] font-medium truncate">{user.country || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                           <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                           <span className="text-[11px] font-medium truncate">{user.joiningDate || 'N/A'}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="bg-[#F8FAFC] rounded-lg p-2 text-center border border-slate-50">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rate</p>
                                <p className="text-xs font-black text-slate-900">${user.payRate || 0}</p>
                            </div>
                            <div className="bg-[#F8FAFC] rounded-lg p-2 text-center border border-slate-50">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Load</p>
                                <p className="text-xs font-black text-slate-900">{metrics.activeTasksCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 pb-4 pt-1">
                        <button 
                          className="w-full py-2 text-[10px] font-bold text-[#475569] uppercase tracking-[0.1em] border border-blue-400/10 rounded-lg hover:bg-blue-50 hover:border-blue-400/30 transition-all"
                        >
                            EDIT PROFILE
                        </button>
                    </div>
                </div>
            );
        })}
      </div>

      {/* AGENT DETAIL MODAL */}
      {selectedAgent && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 md:p-8" onClick={() => setSelectedAgent(null)}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>
                
                {/* Modal Sidebar (Left Column) */}
                <div className="w-[320px] bg-[#F9FBFF] border-r border-slate-100 p-8 flex flex-col overflow-y-auto custom-scrollbar flex-shrink-0">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="mb-4 relative">
                            <div className="w-24 h-24 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-4xl font-bold shadow-lg border-4 border-white">
                                {formData.name?.charAt(0) || '?'}
                            </div>
                        </div>
                        {isEditing ? (
                          <input 
                            className="text-xl font-black text-[#1E293B] bg-white border border-slate-200 text-center focus:ring-1 focus:ring-blue-100 rounded-lg w-full mb-1 p-1 outline-none shadow-sm"
                            value={formData.name || ''}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            placeholder="Agent Name"
                            autoFocus
                          />
                        ) : (
                          <h2 className="text-xl font-black text-[#1E293B] mb-1">{formData.name}</h2>
                        )}
                        <div className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.15em] mt-1 border ${
                          formData.role === UserRole.MANAGER 
                            ? 'bg-amber-100 text-amber-700 border-amber-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                           {formData.role || UserRole.AGENT}
                        </div>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email</p>
                            {isEditing ? (
                              <input 
                                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[11px] text-[#475569] font-semibold shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                  value={formData.email || ''}
                                  onChange={e => setFormData({...formData, email: e.target.value})}
                                  placeholder="email@dataquality.co"
                              />
                            ) : (
                              <div className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[11px] text-[#475569] font-semibold shadow-sm truncate">
                                {formData.email || 'N/A'}
                              </div>
                            )}
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone</p>
                            {isEditing ? (
                              <input 
                                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[11px] text-[#475569] font-semibold shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                  value={formData.phone || ''}
                                  onChange={e => setFormData({...formData, phone: e.target.value})}
                                  placeholder="Phone number"
                              />
                            ) : (
                              <div className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[11px] text-[#475569] font-semibold shadow-sm">
                                {formData.phone || 'N/A'}
                              </div>
                            )}
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Address</p>
                            {isEditing ? (
                              <textarea 
                                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[11px] text-[#475569] font-semibold shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all h-20 resize-none"
                                  value={formData.address || ''}
                                  onChange={e => setFormData({...formData, address: e.target.value})}
                                  placeholder="Full address"
                              />
                            ) : (
                              <div className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[11px] text-[#475569] font-semibold shadow-sm leading-tight h-20 overflow-hidden text-ellipsis">
                                {formData.address || 'N/A'}
                              </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Country</p>
                                {isEditing ? (
                                    <input 
                                        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-center text-[11px] font-black text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none"
                                        value={formData.country || ''}
                                        onChange={e => setFormData({...formData, country: e.target.value})}
                                        placeholder="Country"
                                    />
                                ) : (
                                    <div className="w-full bg-white border border-slate-200 rounded-lg p-3 text-center text-[11px] font-black text-slate-900 shadow-sm">
                                        {formData.country || 'N/A'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pay Rate</p>
                                {isEditing ? (
                                    <div className="relative">
                                      <span className="absolute left-2 top-3 text-[10px] font-bold text-slate-400">$</span>
                                      <input 
                                          type="number"
                                          className="w-full bg-white border border-slate-200 rounded-lg p-3 pl-5 text-center text-[11px] font-black text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none"
                                          value={formData.payRate || 0}
                                          onChange={e => setFormData({...formData, payRate: parseFloat(e.target.value)})}
                                      />
                                    </div>
                                ) : (
                                    <div className="w-full bg-white border border-slate-200 rounded-lg p-3 text-center text-[11px] font-black text-slate-900 shadow-sm">
                                        ${formData.payRate}/hr
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                         {!isAddingNew && selectedAgent.id && selectedAgent.id !== currentUser.id && (
                           <button 
                              onClick={() => {
                                const currentRole = formData.role || selectedAgent.role || UserRole.AGENT;
                                const isMGR = currentRole === UserRole.MANAGER;
                                const newRole = isMGR ? UserRole.AGENT : UserRole.MANAGER;
                                
                                if (window.confirm(`Are you sure you want to ${isMGR ? 'REVOKE' : 'GRANT'} managerial access for ${selectedAgent.name}? ${isMGR ? 'They will lose access to team management features.' : 'They will gain full access to administrative tools.'}`)) {
                                  const updatedUser = { 
                                    ...selectedAgent, 
                                    ...formData, 
                                    role: newRole 
                                  } as User;
                                  
                                  onUpdateUser(updatedUser);
                                  setFormData(updatedUser);
                                  setSelectedAgent(updatedUser);
                                }
                              }}
                              className={`w-full py-3 text-[9px] font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-sm border-2 flex items-center justify-center gap-2 mb-2 ${
                                (formData.role || selectedAgent.role) === UserRole.MANAGER 
                                  ? 'text-amber-600 border-amber-100 bg-amber-50 hover:bg-amber-600 hover:text-white shadow-amber-100' 
                                  : 'text-indigo-600 border-indigo-100 bg-indigo-50 hover:bg-indigo-600 hover:text-white shadow-indigo-100'
                              }`}
                           >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                              {(formData.role || selectedAgent.role) === UserRole.MANAGER ? 'REVOKE MANAGER ACCESS' : 'GRANT MANAGER ACCESS'}
                           </button>
                         )}

                         {isEditing ? (
                           <>
                             <button 
                                onClick={handleSave}
                                className="w-full py-3 text-[9px] font-black text-white bg-blue-600 uppercase tracking-[0.15em] rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                             >
                                {isAddingNew ? 'CREATE AGENT' : 'SAVE CHANGES'}
                             </button>
                             <button 
                                onClick={handleCancelEdit}
                                className="w-full py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                             >
                                CANCEL
                             </button>
                             {!isAddingNew && (
                                <button 
                                    onClick={handleDelete}
                                    className="w-full py-3 text-[9px] font-black text-red-600 uppercase tracking-[0.15em] border border-red-200 bg-red-50 rounded-lg hover:bg-red-600 hover:text-white transition-all mt-2"
                                >
                                    DELETE AGENT
                                </button>
                             )}
                           </>
                         ) : (
                           <button 
                              onClick={handleOpenEdit}
                              className="w-full py-3 text-[9px] font-black text-blue-600 border border-blue-200 bg-blue-50/50 uppercase tracking-[0.15em] rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                           >
                              EDIT PROFILE
                           </button>
                         )}
                    </div>
                </div>

                {/* Main Content (Right Column) */}
                <div className="flex-1 bg-white overflow-y-auto p-8 md:p-10 custom-scrollbar">
                    <h1 className="text-2xl font-black text-[#1E293B] mb-8">Agent Profile & Performance</h1>

                    {/* Performance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        {(() => {
                            const m = (selectedAgent.id || isAddingNew) ? calculateMetrics(selectedAgent.id || 'new') : { augmentCount: 0, qaCount: 0, activeTasksCount: 0 };
                            return (
                                <>
                                    <div className="bg-[#EEF2FF] border border-[#E0E7FF] p-6 rounded-[1.5rem] flex flex-col h-32 transition-all hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-[#4F46E5] uppercase tracking-widest mb-2">Augmentation Total</p>
                                        <div className="mt-auto flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-[#1E293B]">{m.augmentCount}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Units</span>
                                        </div>
                                    </div>
                                    <div className="bg-[#ECFDF5] border border-[#D1FAE5] p-6 rounded-[1.5rem] flex flex-col h-32 transition-all hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-[#059669] uppercase tracking-widest mb-2">QA Completions</p>
                                        <div className="mt-auto flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-[#1E293B]">{m.qaCount}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Units</span>
                                        </div>
                                    </div>
                                    <div className="bg-[#F5F3FF] border border-[#EDE9FE] p-6 rounded-[1.5rem] flex flex-col h-32 transition-all hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest mb-2">Efficiency</p>
                                        <div className="mt-auto flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-[#1E293B]">0</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hrs/Task</span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Historical Activity Table */}
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-slate-100 flex justify-between items-center">
                             <h4 className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Historical Task Activity</h4>
                             <Badge color="gray">Live Data</Badge>
                        </div>
                        <div className="min-h-[300px]">
                            <table className="w-full text-left">
                                <thead className="bg-white border-b border-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedAgent.id && tasks.filter(t => t.assigneeIds.includes(selectedAgent.id)).map(task => (
                                      <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                         <td className="px-6 py-3">
                                            <p className="font-bold text-slate-900 text-xs">{task.title}</p>
                                            <p className="text-[9px] text-slate-400">{new Date(task.createdAt).toLocaleDateString()}</p>
                                         </td>
                                         <td className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">{task.type.replace('_', ' ')}</td>
                                         <td className="px-6 py-3 text-right">
                                            <Badge color={task.status === TaskStatus.DONE ? 'green' : 'blue'}>{task.status}</Badge>
                                         </td>
                                      </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(!selectedAgent.id || tasks.filter(t => t.assigneeIds.includes(selectedAgent.id)).length === 0) && (
                              <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                                  <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                  <p className="text-xs italic font-medium">No historical tasks found.</p>
                              </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
         </div>
      )}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scaleIn overflow-hidden relative">
             <div className="flex items-center gap-4 text-red-600 mb-4">
                <div className="p-3 bg-red-50 rounded-full">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Remove Agent?</h3>
             </div>
             
             <p className="text-slate-600 mb-8 leading-relaxed">
                Are you sure you want to permanently delete <span className="font-bold text-slate-900">{selectedAgent?.name}</span>? 
                All associated logs will remain in history but the profile will be removed.
             </p>

             <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Yes, Remove
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentManagement;
