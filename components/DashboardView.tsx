import React, { useMemo, useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Task, User, TaskStatus, Escalation, UserRole, Notification, LeaveRequest } from '../types';
import { EscalationModal } from './EscalationModal';
import { StatCard, FlowBar, NeedsAttentionRow, MiniMonthCalendar } from './Common';

interface DashboardViewProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  escalations: Escalation[];
  leaveRequests: LeaveRequest[];
  notifications: Notification[];
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  onDismissNotification: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onResolveEscalation: (escalation: Escalation, message: string) => void;
  onCloseEscalation: (escalation: Escalation) => void;
  onUpdateLeaveRequest: (req: LeaveRequest) => void;
}

const DAY_MS = 86400000;

const userName = (users: User[], id?: string) => users.find(u => u.id === id)?.name || 'Unassigned';

const DashboardView: React.FC<DashboardViewProps> = ({
  tasks, users, currentUser, escalations, leaveRequests,
  notifications, connectionStatus, onDismissNotification, onUpdateTask,
  onResolveEscalation, onCloseEscalation, onUpdateLeaveRequest
}) => {
  const [activeEscalation, setActiveEscalation] = useState<Escalation | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  // Sync the currently open escalation modal with updates from the parent prop
  useEffect(() => {
    if (activeEscalation) {
        const fresh = escalations.find(e => e.id === activeEscalation.id);
        if (fresh && JSON.stringify(fresh.history) !== JSON.stringify(activeEscalation.history)) {
            setActiveEscalation(fresh);
        }
    }
  }, [escalations, activeEscalation]);

  const now = Date.now();
  const startOfToday = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)).getTime(), []);

  const statusCounts = useMemo(() => ({
    todo: tasks.filter(t => t.status === TaskStatus.TODO).length,
    inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    onHold: tasks.filter(t => t.status === TaskStatus.ON_HOLD).length,
    done: tasks.filter(t => t.status === TaskStatus.DONE).length,
  }), [tasks]);

  const openTasksToday = useMemo(() => tasks.filter(t => t.createdAt >= startOfToday).length, [tasks, startOfToday]);

  const activeEscalations = useMemo(() => escalations.filter(e => e.status !== 'CLOSED'), [escalations]);
  const escalatedTaskIds = useMemo(() => new Set(activeEscalations.map(e => e.taskId)), [activeEscalations]);

  const onHoldTasks = useMemo(
    () => tasks.filter(t => t.status === TaskStatus.ON_HOLD && !escalatedTaskIds.has(t.id)),
    [tasks, escalatedTaskIds]
  );

  const overdueTasks = useMemo(
    () => tasks.filter(t =>
      t.status !== TaskStatus.DONE &&
      t.status !== TaskStatus.ON_HOLD &&
      !escalatedTaskIds.has(t.id) &&
      t.dueDate && new Date(t.dueDate).getTime() < startOfToday
    ),
    [tasks, escalatedTaskIds, startOfToday]
  );

  const needsAttentionCount = activeEscalations.length + onHoldTasks.length + overdueTasks.length;

  const completedThisWeek = useMemo(
    () => tasks.filter(t => t.status === TaskStatus.DONE && t.completedAt && t.completedAt >= now - 7 * DAY_MS).length,
    [tasks, now]
  );
  const completedPrevWeek = useMemo(
    () => tasks.filter(t => t.status === TaskStatus.DONE && t.completedAt && t.completedAt >= now - 14 * DAY_MS && t.completedAt < now - 7 * DAY_MS).length,
    [tasks, now]
  );
  const completedDeltaPct = completedPrevWeek > 0 ? Math.round(((completedThisWeek - completedPrevWeek) / completedPrevWeek) * 100) : null;

  const turnaround = useMemo(() => {
    const doneWithTimes = tasks.filter(t => t.status === TaskStatus.DONE && t.completedAt);
    if (doneWithTimes.length === 0) return { avgHours: 0, agentCount: 0 };
    const totalHours = doneWithTimes.reduce((sum, t) => sum + (t.completedAt! - t.createdAt) / 3600000, 0);
    const agentIds = new Set(doneWithTimes.flatMap(t => t.assigneeIds));
    return { avgHours: totalHours / doneWithTimes.length, agentCount: agentIds.size };
  }, [tasks]);

  const dueTodayTasks = useMemo(
    () => tasks.filter(t => {
      if (t.status === TaskStatus.DONE || !t.dueDate) return false;
      const d = new Date(t.dueDate).getTime();
      return d >= startOfToday && d < startOfToday + DAY_MS;
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [tasks, startOfToday]
  );

  const pendingLeaves = useMemo(() => leaveRequests.filter(r => r.status === 'PENDING'), [leaveRequests]);
  const myLeaves = useMemo(
    () => leaveRequests.filter(r => r.userId === currentUser.id).sort((a, b) => b.createdAt - a.createdAt),
    [leaveRequests, currentUser.id]
  );

  const calendarEvents = useMemo(() => {
    const map: Record<string, { colorClass: string; label?: string }[]> = {};
    leaveRequests.filter(r => r.status === 'APPROVED' || r.status === 'PENDING').forEach(r => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const colorClass = r.status === 'APPROVED' ? 'bg-accent' : 'bg-warning';
        (map[key] ||= []).push({ colorClass, label: `${r.userName} (${r.type})` });
      }
    });
    return map;
  }, [leaveRequests]);

  const handleEscalationReply = (message: string) => {
      if (activeEscalation) onResolveEscalation(activeEscalation, message);
  };

  const handleEscalationClose = () => {
      if (activeEscalation) {
          onCloseEscalation(activeEscalation);
          setActiveEscalation(null);
      }
  };

  const escalationMeta = (esc: Escalation): { meta: string; action: { label: string; emphasis: boolean } } => {
    const isMyTurn = currentUser.role === UserRole.MANAGER ? esc.status === 'PENDING' : esc.status === 'RESPONDED';
    if (isMyTurn) {
      return { meta: `${esc.agentName} · waiting on you`, action: { label: 'Respond', emphasis: true } };
    }
    return { meta: `${esc.agentName} · ${esc.status === 'PENDING' ? 'waiting on manager' : 'you replied'}`, action: { label: 'View', emphasis: false } };
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }, []);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-[21px] font-bold text-ink tracking-tight">{greeting}, {currentUser.name.split(' ')[0]}</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}
            <span className={connectionStatus === 'CONNECTED' ? 'text-success-text font-semibold' : 'text-ink-muted'}>
              {connectionStatus === 'CONNECTED' ? 'Live Sync' : connectionStatus === 'CONNECTING' ? 'Connecting…' : 'Offline'}
            </span>
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNotifications(v => !v)}
            className="w-[34px] h-[34px] rounded-lg bg-surface border border-slate-200 flex items-center justify-center text-ink-secondary relative hover:bg-slate-50"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-danger" />
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface rounded-card shadow-lg border border-slate-200 z-20 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-ink-muted text-xs italic">No new notifications.</div>
              ) : notifications.map(n => (
                <div key={n.id} className="p-3 border-b border-slate-100 last:border-0 flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink">{n.title}</p>
                    <p className="text-[11px] text-ink-secondary mt-0.5">{n.message}</p>
                  </div>
                  <button onClick={() => onDismissNotification(n.id)} className="text-ink-muted hover:text-ink text-xs flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Open Tasks" value={statusCounts.todo + statusCounts.inProgress + statusCounts.onHold}
          delta={openTasksToday > 0 ? { text: `+${openTasksToday} today`, tone: 'success' } : undefined} />
        <StatCard label="Needs Attention" value={needsAttentionCount} tone={needsAttentionCount > 0 ? 'danger' : 'default'}
          delta={overdueTasks.length > 0 ? { text: `${overdueTasks.length} overdue`, tone: 'danger' } : undefined}
          subtext={`${activeEscalations.length} escalation${activeEscalations.length === 1 ? '' : 's'} · ${onHoldTasks.length} on hold`} />
        <StatCard label="Completed This Week" value={completedThisWeek}
          delta={completedDeltaPct !== null ? { text: `${completedDeltaPct >= 0 ? '▲' : '▼'} ${Math.abs(completedDeltaPct)}%`, tone: completedDeltaPct >= 0 ? 'success' : 'danger' } : undefined} />
        <StatCard label="Avg Turnaround" value={`${turnaround.avgHours.toFixed(1)}h`}
          subtext={`across ${turnaround.agentCount} agent${turnaround.agentCount === 1 ? '' : 's'}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 flex-1 overflow-hidden">
        <div className="flex flex-col gap-4 overflow-y-auto pr-0.5">
          <div className={`bg-surface rounded-card p-4 shadow-sm ${needsAttentionCount > 0 ? 'border border-danger-bg' : ''}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-ink">Needs Attention</h3>
            </div>
            <div className="flex flex-col gap-2">
              {needsAttentionCount === 0 && (
                <div className="text-center py-6 text-ink-muted italic text-sm">Nothing needs attention right now.</div>
              )}
              {activeEscalations.map(esc => {
                const { meta, action } = escalationMeta(esc);
                return (
                  <NeedsAttentionRow
                    key={esc.id}
                    chip={{ label: 'ESCALATED', tone: 'danger' }}
                    title={esc.taskTitle}
                    meta={meta}
                    onClick={() => setActiveEscalation(esc)}
                    action={{ ...action, onClick: () => setActiveEscalation(esc) }}
                  />
                );
              })}
              {onHoldTasks.map(task => {
                const daysAgo = Math.floor((now - task.createdAt) / DAY_MS);
                return (
                  <NeedsAttentionRow
                    key={task.id}
                    chip={{ label: 'ON HOLD', tone: 'warning' }}
                    title={task.title}
                    meta={`${task.assigneeIds.map(id => userName(users, id)).join(', ') || 'Unassigned'} · created ${daysAgo}d ago`}
                    action={{ label: 'Resume', emphasis: false, onClick: () => onUpdateTask({ ...task, status: TaskStatus.IN_PROGRESS }) }}
                  />
                );
              })}
              {overdueTasks.map(task => {
                const daysOverdue = Math.floor((now - new Date(task.dueDate).getTime()) / DAY_MS);
                return (
                  <NeedsAttentionRow
                    key={task.id}
                    chip={{ label: 'OVERDUE', tone: 'danger' }}
                    title={task.title}
                    meta={`${daysOverdue}d overdue · ${task.assigneeIds.map(id => userName(users, id)).join(', ') || 'Unassigned'}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="bg-surface rounded-card p-4 shadow-sm flex-1 flex flex-col overflow-hidden">
            <h3 className="text-sm font-bold text-ink mb-3">Task Flow</h3>
            <FlowBar
              height={22}
              segments={[
                { label: 'To Do', count: statusCounts.todo, colorClass: 'bg-[#c9d2e6]' },
                { label: 'In Progress', count: statusCounts.inProgress, colorClass: 'bg-accent' },
                { label: 'On Hold', count: statusCounts.onHold, colorClass: 'bg-warning' },
                { label: 'Done', count: statusCounts.done, colorClass: 'bg-success' },
              ]}
            />
            <div className="text-[11.5px] font-bold text-ink-muted uppercase tracking-wide mt-5 mb-2">Due Today</div>
            <div className="flex-1 overflow-y-auto">
              {dueTodayTasks.length === 0 ? (
                <div className="text-ink-muted text-xs italic py-2">Nothing due today.</div>
              ) : dueTodayTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => onUpdateTask({ ...task, status: TaskStatus.DONE, completedAt: Date.now() })}
                  className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-0 w-full text-left group"
                >
                  <span className="w-[15px] h-[15px] rounded-full border-2 border-slate-300 flex-shrink-0 group-hover:border-accent transition-colors" />
                  <span className="text-[12.5px] font-semibold text-ink">{task.title}</span>
                  <span className="ml-auto text-[11px] text-ink-muted">Due today</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto pr-0.5">
          {currentUser.role === UserRole.MANAGER && (
            <div className="bg-surface rounded-card p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="text-sm font-bold text-ink">Pending Leave</h3>
                {pendingLeaves.length > 0 && (
                  <span className="text-[10.5px] font-bold text-white bg-warning px-2 py-0.5 rounded-full">{pendingLeaves.length}</span>
                )}
              </div>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {pendingLeaves.length === 0 ? (
                  <div className="text-ink-muted text-xs italic py-2">No pending leave requests.</div>
                ) : pendingLeaves.map(req => (
                  <div key={req.id} className="bg-warning-bg rounded-lg px-3 py-2 flex justify-between items-center">
                    <div>
                      <div className="text-[12.5px] font-bold text-ink">{req.userName}</div>
                      <div className="text-[11px] text-warning-text mt-0.5">{req.type} · {req.startDate} to {req.endDate}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => onUpdateLeaveRequest({ ...req, status: 'APPROVED' })} className="w-6 h-6 rounded-md bg-white border border-emerald-100 text-success-text flex items-center justify-center text-xs">✓</button>
                      <button onClick={() => onUpdateLeaveRequest({ ...req, status: 'REJECTED' })} className="w-6 h-6 rounded-md bg-white border border-red-100 text-danger-text flex items-center justify-center text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentUser.role === UserRole.AGENT && (
            <div className="bg-surface rounded-card p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="text-sm font-bold text-ink">My Leave Requests</h3>
                <span className="text-[10.5px] font-bold text-white bg-accent px-2 py-0.5 rounded-full">{myLeaves.length}</span>
              </div>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {myLeaves.length === 0 ? (
                  <div className="text-ink-muted text-xs italic py-2">No leave requests submitted.</div>
                ) : myLeaves.map(req => (
                  <div key={req.id} className="bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[12.5px] font-bold text-ink">{req.type}</span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                        req.status === 'APPROVED' ? 'bg-success-bg text-success-text' :
                        req.status === 'REJECTED' ? 'bg-danger-bg text-danger-text' : 'bg-warning-bg text-warning-text'
                      }`}>{req.status}</span>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">{req.startDate} to {req.endDate}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface rounded-card p-4 shadow-sm flex-1">
            <MiniMonthCalendar
              month={calendarMonth}
              onPrevMonth={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              onNextMonth={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              events={calendarEvents}
            />
            <div className="flex gap-3 text-[10px] text-ink-muted mt-3">
              <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-accent inline-block" /> Today</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" /> Pending leave</span>
            </div>
          </div>
        </div>
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
