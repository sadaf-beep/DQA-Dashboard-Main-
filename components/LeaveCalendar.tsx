import React, { useState, useMemo } from 'react';
import { User, UserRole, LeaveRequest, LeaveType } from '../types';
import { Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateId } from '../services/id';
import { Button, PillSegmentedControl } from './Common';

const BD_HOLIDAYS = [
  { name: "New Year's Day", date: '2026-01-01' },
  { name: 'Shab-e-Qadr', date: '2026-03-17' },
  { name: 'Eid-ul-Fitr', date: '2026-03-19' },
  { name: 'Eid-ul-Fitr', date: '2026-03-20' },
  { name: 'Pohela Boishakh', date: '2026-04-14' },
  { name: 'Eid-ul-Adha', date: '2026-05-26' },
  { name: 'Eid-ul-Adha', date: '2026-05-27' },
  { name: 'Eid-ul-Adha', date: '2026-05-28' },
  { name: 'Victory Day', date: '2026-12-16' },
  { name: 'EOY Break', date: '2026-12-25' },
  { name: 'EOY Break', date: '2026-12-28' },
  { name: 'EOY Break', date: '2026-12-29' },
  { name: 'EOY Break', date: '2026-12-30' },
  { name: 'EOY Break', date: '2026-12-31' },
];

const IND_HOLIDAYS = [
  { name: "New Year's Day", date: '2026-01-01' },
  { name: 'Independence Day', date: '2026-08-15' },
  { name: 'Diwali', date: '2026-11-09' },
];

interface LeaveCalendarProps {
  currentUser: User;
  users: User[];
  leaveRequests: LeaveRequest[];
  onAddLeaveRequest: (req: LeaveRequest) => void;
  onUpdateLeaveRequest: (req: LeaveRequest) => void;
  onDeleteLeaveRequest: (id: string) => void;
}

const LeaveCalendar: React.FC<LeaveCalendarProps> = ({ currentUser, users, leaveRequests, onAddLeaveRequest, onUpdateLeaveRequest, onDeleteLeaveRequest }) => {
  const isManager = currentUser.role === UserRole.MANAGER;
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // New Request State
  const [leaveType, setLeaveType] = useState<LeaveType>('Annual Leave');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clashWarning, setClashWarning] = useState<string | null>(null);

  // Calculate days requested (simple calculation for now, ignoring weekends)
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays;
  };

  // Check for clashes
  const checkClashes = (start: string, end: string) => {
    if (!start || !end) return;
    const sDate = new Date(start).getTime();
    const eDate = new Date(end).getTime();

    const clashingRequests = leaveRequests.filter(req => {
      if (req.userId === currentUser.id) return false; // Ignore own requests
      if (req.status === 'REJECTED') return false;
      const reqStart = new Date(req.startDate).getTime();
      const reqEnd = new Date(req.endDate).getTime();
      
      // Check overlap
      return (sDate <= reqEnd && eDate >= reqStart);
    });

    if (clashingRequests.length > 0) {
      const names = Array.from(new Set(clashingRequests.map(r => r.userName))).join(', ');
      setClashWarning(`Warning: Your requested dates overlap with approved/pending leave for: ${names}`);
    } else {
      setClashWarning(null);
    }
  };

  // Calculate total approved leave days for the current user
  const totalApprovedDays = useMemo(() => {
    return leaveRequests
      .filter(req => req.userId === currentUser.id && req.status === 'APPROVED' && req.type === 'Annual Leave')
      .reduce((total, req) => total + req.daysRequested, 0);
  }, [leaveRequests, currentUser.id]);

  const STANDARD_LEAVE_QUOTA = 20; // 4 weeks = 20 working days

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    checkClashes(e.target.value, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    checkClashes(startDate, e.target.value);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) return;

    const days = calculateDays(startDate, endDate);
    
    if (editingRequest) {
      const updatedRequest: LeaveRequest = {
        ...editingRequest,
        type: leaveType,
        reason,
        startDate,
        endDate,
        daysRequested: days,
        status: leaveType === 'Sick Leave' ? 'APPROVED' : 'PENDING', // Re-evaluate status if type changed
      };
      onUpdateLeaveRequest(updatedRequest);
    } else {
      const newRequest: LeaveRequest = {
        id: generateId('leave'),
        userId: currentUser.id,
        userName: currentUser.name,
        type: leaveType,
        reason,
        startDate,
        endDate,
        status: leaveType === 'Sick Leave' ? 'APPROVED' : 'PENDING',
        createdAt: Date.now(),
        daysRequested: days
      };

      console.log("Submitting Leave Request:", newRequest);
      onAddLeaveRequest(newRequest);
    }
    
    // Reset form
    handleCloseModal();
  };

  const handleEditRequest = (req: LeaveRequest) => {
    setEditingRequest(req);
    setLeaveType(req.type);
    setReason(req.reason || '');
    setStartDate(req.startDate);
    setEndDate(req.endDate);
    setIsRequestModalOpen(true);
  };

  const handleCloseModal = () => {
    setLeaveType('Annual Leave');
    setReason('');
    setStartDate('');
    setEndDate('');
    setClashWarning(null);
    setEditingRequest(null);
    setIsRequestModalOpen(false);
  };

  const myRequests = useMemo(() => {
    const filtered = leaveRequests.filter(r => r.userId === currentUser.id).sort((a, b) => b.createdAt - a.createdAt);
    console.log("My Leave Requests Filtered:", filtered.length, "for user:", currentUser.id);
    return filtered;
  }, [leaveRequests, currentUser.id]);
  const pendingRequests = useMemo(() => leaveRequests.filter(r => r.status === 'PENDING').sort((a, b) => a.createdAt - b.createdAt), [leaveRequests]);
  const allRequests = useMemo(() => [...leaveRequests].sort((a, b) => b.createdAt - a.createdAt), [leaveRequests]);

  const [managerTab, setManagerTab] = useState<'PENDING' | 'APPROVED' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = useMemo(() => {
    let base = [];
    if (managerTab === 'PENDING') {
      base = pendingRequests;
    } else if (managerTab === 'APPROVED') {
      base = leaveRequests.filter(r => r.status === 'APPROVED').sort((a, b) => b.createdAt - a.createdAt);
    } else {
      base = allRequests;
    }
    
    if (!searchQuery) return base;
    return base.filter(r => r.userName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [managerTab, pendingRequests, allRequests, leaveRequests, searchQuery]);

  // Combined calendar items (Leaves + Holidays)
  const calendarItems = useMemo(() => {
    const leaves = leaveRequests
      .filter(r => r.status === 'APPROVED')
      .map(r => ({
        id: r.id,
        date: r.startDate,
        endDate: r.endDate,
        title: r.userName,
        type: r.type,
        status: r.status,
        isHoliday: false,
        days: r.daysRequested
      }));

    const bdHolidays = BD_HOLIDAYS.map((h, i) => ({
      id: `holiday-bd-${i}`,
      date: h.date,
      endDate: h.date,
      title: h.name,
      type: 'BD Holiday',
      country: 'BD',
      status: 'APPROVED',
      isHoliday: true,
      days: 1
    }));

    const indHolidays = IND_HOLIDAYS.map((h, i) => ({
      id: `holiday-ind-${i}`,
      date: h.date,
      endDate: h.date,
      title: h.name,
      type: 'IND Holiday',
      country: 'IND',
      status: 'APPROVED',
      isHoliday: true,
      days: 1
    }));

    return [...leaves, ...bdHolidays, ...indHolidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [leaveRequests]);

  const handleApprove = (req: LeaveRequest) => {
    onUpdateLeaveRequest({ ...req, status: 'APPROVED' });
  };

  const handleReject = (req: LeaveRequest) => {
    onUpdateLeaveRequest({ ...req, status: 'REJECTED' });
  };

  // Calendar Grid Helpers
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Fill leading empty days
    const firstDayOfWeek = date.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Fill actual days
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    
    return days;
  }, [currentMonth]);

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const getEventsForDay = (day: Date) => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    
    const leaves = leaveRequests
      .filter(r => r.status === 'APPROVED' && 
                   dateStr >= r.startDate && dateStr <= r.endDate)
      .map(r => ({ ...r, isHoliday: false }));

    const bdHolidays = BD_HOLIDAYS
      .filter(h => h.date === dateStr)
      .map(h => ({ ...h, isHoliday: true, country: 'BD' }));

    const indHolidays = IND_HOLIDAYS
      .filter(h => h.date === dateStr)
      .map(h => ({ ...h, isHoliday: true, country: 'IND' }));

    return [...leaves, ...bdHolidays, ...indHolidays];
  };

  const renderRequestCard = (req: LeaveRequest, showActions: boolean) => {
    const statusStyle = {
      PENDING: { bg: 'bg-warning-bg', border: 'border-l-warning', chipBg: 'bg-[#f5e3c2]', chipText: 'text-warning-text' },
      APPROVED: { bg: 'bg-slate-50', border: 'border-l-success', chipBg: 'bg-success-bg', chipText: 'text-success-text' },
      REJECTED: { bg: 'bg-slate-50', border: 'border-l-danger', chipBg: 'bg-danger-bg', chipText: 'text-danger-text' },
    }[req.status];

    // Calculate if this user has exceeded their quota (only for managers looking at pending requests)
    let isOverQuota = false;
    let userTotalDays = 0;
    if (isManager && req.type === 'Annual Leave' && req.status === 'PENDING') {
      userTotalDays = leaveRequests
        .filter(r => r.userId === req.userId && r.status === 'APPROVED' && r.type === 'Annual Leave')
        .reduce((total, r) => total + r.daysRequested, 0);

      if (userTotalDays + req.daysRequested > STANDARD_LEAVE_QUOTA) {
        isOverQuota = true;
      }
    }

    return (
      <div key={req.id} className={`p-3 border-l-[3px] rounded-lg mb-2.5 ${statusStyle.bg} ${statusStyle.border}`}>
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-[12.5px] text-ink">{req.userName}</span>
          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${statusStyle.chipBg} ${statusStyle.chipText}`}>
            {req.status === 'PENDING' ? 'UNDER REVIEW' : req.status}
          </span>
        </div>
        <p className="text-[11px] text-ink-muted">{req.type} · {req.daysRequested} day{req.daysRequested === 1 ? '' : 's'} · {req.startDate} to {req.endDate}</p>

        {isOverQuota && (
          <div className="bg-danger-bg text-danger-text text-xs p-2 rounded mt-2 flex items-start gap-1.5 border border-red-100">
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Agent has used {userTotalDays} days. This request ({req.daysRequested} days) exceeds the {STANDARD_LEAVE_QUOTA}-day quota.</span>
          </div>
        )}

        {showActions && req.status === 'PENDING' && (
          <div className="flex gap-1.5 mt-2">
            <div className="flex-1 text-center text-[11px] font-bold text-success-text bg-white py-1.5 rounded-md cursor-pointer hover:bg-success-bg" onClick={() => handleApprove(req)}>Approve</div>
            <div className="flex-1 text-center text-[11px] font-bold text-danger-text bg-white py-1.5 rounded-md cursor-pointer hover:bg-danger-bg" onClick={() => handleReject(req)}>Reject</div>
          </div>
        )}

        {!isManager && req.userId === currentUser.id && (
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => handleEditRequest(req)}
              className="flex-1 bg-white text-accent hover:bg-blue-50 py-1.5 rounded-md text-[11px] font-bold transition-colors"
            >
              Modify
            </button>
            <button
              onClick={() => setDeletingRequestId(req.id)}
              className="flex-1 bg-white text-ink-secondary hover:bg-slate-100 py-1.5 rounded-md text-[11px] font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-[21px] font-bold text-ink tracking-tight">Leave & Holidays</h2>
           <p className="text-xs text-ink-muted mt-0.5">Manage holiday requests and view team availability</p>
        </div>
        {!isManager && (
          <Button onClick={() => setIsRequestModalOpen(true)} className="text-[12px]">
            + Request Leave
          </Button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 overflow-hidden">
        {/* Left Column: Interactive Calendar Grid */}
        <div className="bg-surface rounded-card shadow-sm flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-bold text-ink">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-200 text-ink-secondary transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-2 py-1 text-[9.5px] font-bold text-ink-secondary hover:bg-slate-200 transition-colors">
                  TODAY
                </button>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-200 text-ink-secondary transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span> Approved
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-warning"></span> Pending
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span> BD Holiday
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c18a1f]"></span> IND Holiday
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-3">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-ink-muted uppercase tracking-wider py-1.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-px bg-slate-100 rounded-lg overflow-hidden">
              {daysInMonth.map((day, idx) => {
                const events = day ? getEventsForDay(day) : [];
                const isToday = day && day.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={idx}
                    className={`min-h-[76px] p-1.5 bg-surface flex flex-col gap-1 transition-colors hover:bg-slate-50/50 ${!day ? 'bg-slate-50/30' : ''}`}
                  >
                    {day && (
                      <>
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-bold ${isToday ? 'bg-accent text-white w-[18px] h-[18px] flex items-center justify-center rounded-full' : 'text-ink-secondary'}`}>
                            {day.getDate()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[54px] custom-scrollbar">
                          {events.map((ev, i) => {
                            const isHoliday = 'isHoliday' in ev && ev.isHoliday;
                            const country = 'country' in ev ? ev.country : null;
                            const status = 'status' in ev ? ev.status : null;
                            const title = 'userName' in ev ? ev.userName : ('name' in ev ? ev.name : '');

                            let bgColor = 'bg-blue-50 text-[#2c4a91]';
                            let dotColor = 'bg-accent';

                            if (isHoliday) {
                              if (country === 'BD') {
                                bgColor = 'bg-success-bg text-success-text';
                                dotColor = 'bg-success';
                              } else {
                                bgColor = 'bg-warning-bg text-[#c18a1f]';
                                dotColor = 'bg-[#c18a1f]';
                              }
                            } else if (status === 'PENDING') {
                              bgColor = 'bg-warning-bg text-warning-text';
                              dotColor = 'bg-warning';
                            }

                            return (
                              <div
                                key={i}
                                className={`text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 truncate font-bold ${bgColor}`}
                                title={title}
                              >
                                <span className={`w-1 h-1 rounded-full shrink-0 ${dotColor}`}></span>
                                <span className="truncate">{title}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Quota, Requests, Upcoming Holidays */}
        <div className="flex flex-col gap-3 overflow-hidden">
          <div className="bg-surface rounded-card p-4 shadow-sm">
            <div className="flex justify-between text-xs text-ink-secondary mb-1.5">
              <span className="font-bold text-ink">Annual Leave Quota</span>
              <span>{totalApprovedDays} / {STANDARD_LEAVE_QUOTA} days</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${totalApprovedDays >= STANDARD_LEAVE_QUOTA ? 'bg-danger' : 'bg-accent'}`}
                style={{ width: `${Math.min((totalApprovedDays / STANDARD_LEAVE_QUOTA) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-surface rounded-card shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-3.5 pb-2.5 border-b border-slate-100">
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="text-[13px] font-bold text-ink">{isManager ? 'Leave Requests' : 'My Requests'}</h3>
                {isManager && (
                  <PillSegmentedControl
                    value={managerTab}
                    onChange={v => setManagerTab(v as 'PENDING' | 'APPROVED' | 'ALL')}
                    options={[{ value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' }, { value: 'ALL', label: 'All' }]}
                  />
                )}
              </div>
              {isManager && (
                <input
                  type="text"
                  placeholder="Search agent…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[26px] px-2.5 text-[11px] bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-accent outline-none"
                />
              )}
            </div>
            <div className="flex-1 p-3 overflow-y-auto">
              {isManager ? (
                filteredRequests.length === 0 ? (
                  <div className="text-center py-10 text-ink-muted">
                    <p className="text-sm">No requests found.</p>
                  </div>
                ) : (
                  filteredRequests.map(req => renderRequestCard(req, req.status === 'PENDING'))
                )
              ) : (
                myRequests.length === 0 ? (
                  <div className="text-center py-10 text-ink-muted">
                    <p className="text-sm">No leave requests found.</p>
                  </div>
                ) : (
                  myRequests.map(req => renderRequestCard(req, false))
                )
              )}
            </div>

            <div className="p-3.5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="w-3.5 h-3.5 text-ink-muted" />
                <h3 className="text-[11px] font-bold text-ink-muted uppercase tracking-wide">Upcoming Holidays</h3>
              </div>
              <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {[...BD_HOLIDAYS.map(h => ({ ...h, country: 'BD' })), ...IND_HOLIDAYS.map(h => ({ ...h, country: 'IND' }))]
                  .filter(h => new Date(h.date).getTime() >= new Date('2026-03-26').getTime())
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((h, i) => (
                    <li key={i} className="flex justify-between items-center text-[11.5px]">
                      <span className="text-ink-secondary flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${h.country === 'BD' ? 'bg-success' : 'bg-[#c18a1f]'}`}></span>
                        {h.name}
                      </span>
                      <span className="font-semibold text-ink">
                        {new Date(h.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Request Leave Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingRequest ? 'Modify Leave Request' : 'Request Leave'}
            </h3>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label>
                <input 
                  type="text" 
                  value={currentUser.name} 
                  disabled 
                  className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Short-Notice Leave">Short-Notice Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Bereavement Leave">Bereavement Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="date" 
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="date" 
                    value={endDate}
                    onChange={handleEndDateChange}
                    min={startDate}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {leaveType === 'Annual Leave' && (
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between mb-1">
                    <span>Annual Leave Quota:</span>
                    <span className="font-medium">{totalApprovedDays} / {STANDARD_LEAVE_QUOTA} days used</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                    <div 
                      className={`h-1.5 rounded-full ${totalApprovedDays >= STANDARD_LEAVE_QUOTA ? 'bg-red-500' : 'bg-blue-500'}`} 
                      style={{ width: `${Math.min((totalApprovedDays / STANDARD_LEAVE_QUOTA) * 100, 100)}%` }}
                    ></div>
                  </div>
                  {totalApprovedDays + calculateDays(startDate, endDate) > STANDARD_LEAVE_QUOTA && (
                    <p className="text-red-500 mt-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      This request exceeds your standard 4-week quota. It will require special manager approval.
                    </p>
                  )}
                </div>
              )}

              {clashWarning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>{clashWarning}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a brief reason..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 h-24 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                  {editingRequest ? 'Update Request' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deletingRequestId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h3 className="text-lg font-bold text-slate-900">Cancel Request?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">Are you sure you want to cancel this leave request? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeletingRequestId(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors text-sm"
              >
                No, Keep it
              </button>
              <button 
                onClick={() => {
                  onDeleteLeaveRequest(deletingRequestId);
                  setDeletingRequestId(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
              >
                Yes, Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveCalendar;
