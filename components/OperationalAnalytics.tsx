
import React, { useMemo } from 'react';
import { Task, InventoryFile, Invoice, User, InventoryStatus, TaskStatus } from '../types';
import { Card, Badge } from './Common';

interface OperationalAnalyticsProps {
  tasks: Task[];
  inventories: InventoryFile[];
  invoices: Invoice[];
  users: User[];
}

const OperationalAnalytics: React.FC<OperationalAnalyticsProps> = ({ tasks, inventories, invoices, users }) => {
  const currentMonthYear = "February 2026";

  const stats = useMemo(() => {
    let augmented = 0;
    let qaed = 0;
    const agentVol: Record<string, { aug: number; qa: number }> = {};
    
    // Initialize agents
    users.filter(u => u.role === 'AGENT').forEach(u => {
        agentVol[u.id] = { aug: 0, qa: 0 };
    });

    const studioData = inventories.map(inv => {
      let invAug = 0;
      let invQA = 0;
      const studioAgents = new Set<string>();
      
      inv.data.forEach(item => {
        if (item.status === InventoryStatus.AUGMENTED || item.status === InventoryStatus.QA_COMPLETE) {
          invAug++;
          augmented++;
          if (item.assigneeId) {
            const agent = users.find(u => u.id === item.assigneeId);
            if (agent) studioAgents.add(agent.name);
            if (agentVol[item.assigneeId]) agentVol[item.assigneeId].aug++;
          }
        }
        if (item.status === InventoryStatus.QA_COMPLETE) {
          invQA++;
          qaed++;
          if (item.assigneeId) {
            const agent = users.find(u => u.id === item.assigneeId);
            if (agent) studioAgents.add(agent.name);
            if (agentVol[item.assigneeId]) agentVol[item.assigneeId].qa++;
          }
        }
      });

      // Time taken calculation logic:
      // We look for tasks associated with this filename to find the latest completion
      const associatedTasks = tasks.filter(t => t.title.includes(inv.fileName));
      const completedTasks = associatedTasks.filter(t => t.status === TaskStatus.DONE);
      
      let durationText = "—";
      const isDone = invAug === inv.rowCount && invQA === inv.rowCount;

      if (inv.uploadDate) {
        if (isDone && completedTasks.length > 0) {
          const lastCompletion = Math.max(...completedTasks.map(t => t.completedAt || Date.now()));
          const diffHrs = Math.round((lastCompletion - inv.uploadDate) / 3600000);
          durationText = diffHrs > 0 ? `${diffHrs}h` : "< 1h";
        } else if (invAug > 0 || invQA > 0) {
          const diffHrs = Math.round((Date.now() - inv.uploadDate) / 3600000);
          durationText = `${diffHrs}h elapsed`;
        }
      }

      return {
        name: inv.fileName,
        total: inv.rowCount,
        augmented: invAug,
        qa: invQA,
        reviewed: invAug + invQA,
        augPercent: inv.rowCount > 0 ? Math.round((invAug / inv.rowCount) * 100) : 0,
        qaPercent: inv.rowCount > 0 ? Math.round((invQA / inv.rowCount) * 100) : 0,
        status: isDone ? 'COMPLETED' : 'IN_PROGRESS',
        agents: Array.from(studioAgents),
        timeTaken: durationText
      };
    });

    // Invoices are completed if status is COMPLETED (agent done) or UPLOADED (manager done)
    const completedInvoices = invoices.filter(i => i.status === 'COMPLETED' || i.status === 'UPLOADED').length;
    const activeAgents = users.filter(u => u.role === 'AGENT').length;

    return {
      totalAugmented: augmented,
      totalQAed: qaed,
      totalInvoices: completedInvoices,
      totalCapacity: activeAgents,
      agentVolume: agentVol,
      studioProgress: studioData
    };
  }, [inventories, invoices, users, tasks]);

  return (
    <div className="flex flex-col gap-8 animate-fadeIn pb-12 bg-slate-50 min-h-full">
      {/* Header Info */}
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-2xl font-bold text-slate-900">Operational Analytics</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
             <span className="text-[10px] font-black uppercase tracking-widest">Live Reporting Active</span>
          </div>
        </div>
        <p className="text-sm text-slate-400 font-medium">
            Monthly Throughput & Productivity Reporting • {currentMonthYear}
        </p>
      </div>

      {/* Top Scorecards (4 Column Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-7 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 relative z-10">Total Augmented</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-4xl font-black text-slate-900">{stats.totalAugmented}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Units</span>
          </div>
          <div className="mt-4 relative z-10">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">
                Across {stats.studioProgress.length} Studios
            </span>
          </div>
        </Card>

        <Card className="p-7 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 relative z-10">Total QA'd Products</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-4xl font-black text-slate-900">{stats.totalQAed}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Units</span>
          </div>
          <div className="mt-4 relative z-10">
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">
                Final Validated
            </span>
          </div>
        </Card>

        <Card className="p-7 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 relative z-10">Invoices Completed</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-4xl font-black text-slate-900">{stats.totalInvoices}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Files</span>
          </div>
          <div className="mt-4 relative z-10">
            <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full">
                System Logged
            </span>
          </div>
        </Card>

        <Card className="p-7 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 relative z-10">Current Capacity</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-4xl font-black text-slate-900">{stats.totalCapacity}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agents</span>
          </div>
          <div className="mt-4 relative z-10">
            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full">
                Active Ops
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Studio Progress Ledger (Full Width for extra columns) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap">Studio Progress Ledger</h3>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>
          
          <Card className="overflow-hidden border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F9FBFF] border-b border-slate-100">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Studio Name</th>
                    <th className="px-6 py-4">Throughput (Aug / QA)</th>
                    <th className="px-6 py-4 text-center">Reviewed</th>
                    <th className="px-6 py-4">Assigned Agents</th>
                    <th className="px-6 py-4 text-center">Time Taken</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.studioProgress.map((studio, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5">
                        <p className="font-black text-slate-800 text-sm mb-0.5">{studio.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{studio.total} Total Products</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-400 w-6">AUG</span>
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-500 rounded-full" style={{ width: `${studio.augPercent}%` }}></div>
                              </div>
                              <span className="text-[9px] font-black text-slate-700">{studio.augPercent}%</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-400 w-6">QA</span>
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${studio.qaPercent}%` }}></div>
                              </div>
                              <span className="text-[9px] font-black text-slate-700">{studio.qaPercent}%</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex flex-col">
                           <span className="text-sm font-black text-slate-800">{studio.reviewed}</span>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Actions</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                           {studio.agents.length > 0 ? studio.agents.map((name, idx) => (
                             <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded border border-slate-200">
                               {name}
                             </span>
                           )) : (
                             <span className="text-[10px] text-slate-300 italic">Unassigned</span>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-sm font-black text-slate-700">{studio.timeTaken}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                         <span className={`px-2 py-1 rounded text-[9px] font-black tracking-widest ${
                           studio.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                         }`}>
                           {studio.status}
                         </span>
                      </td>
                    </tr>
                  ))}
                  {stats.studioProgress.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-300 italic text-xs">Waiting for studio data...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Agent Leaderboard Row */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap">Agent Leaderboard</h3>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {users.filter(u => u.role === 'AGENT')
                .sort((a,b) => {
                    const volA = (stats.agentVolume[a.id]?.aug || 0) + (stats.agentVolume[a.id]?.qa || 0);
                    const volB = (stats.agentVolume[b.id]?.aug || 0) + (stats.agentVolume[b.id]?.qa || 0);
                    return volB - volA;
                })
                .slice(0, 4).map((agent, i) => {
                    const agentStats = stats.agentVolume[agent.id] || { aug: 0, qa: 0 };
                    const totalUnits = agentStats.aug + agentStats.qa;
                    
                    return (
                        <Card key={agent.id} className="p-6 border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center font-bold text-sm ${
                                    i === 0 ? 'bg-amber-50 text-amber-600 border-amber-200 ring-4 ring-amber-50' : 'bg-slate-50 text-slate-400'
                                }`}>
                                    {i + 1}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800 leading-tight mb-0.5">{agent.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {agentStats.aug} Aug. | {agentStats.qa} QA
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-slate-900 leading-tight">{totalUnits}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Units</p>
                            </div>
                        </Card>
                    );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalAnalytics;
