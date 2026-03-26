import React, { useState, useMemo } from 'react';
import { User, UserRole, LeaveRequest, LeaveType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar as CalendarIcon, Info, BarChart2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

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
  { name: 'Independence Day', date: '2026-08-14' },
  { name: 'Diwali', date: '2026-11-09' },
];

interface LeaveCalendarProps {
  currentUser: User;
  users: User[];
  leaveRequests: LeaveRequest[];
  onAddLeaveRequest: (req: LeaveRequest) => void;
  onUpdateLeaveRequest: (req: LeaveRequest) => void;
}

const LeaveCalendar: React.FC<LeaveCalendarProps> = ({ currentUser, users, leaveRequests, onAddLeaveRequest, onUpdateLeaveRequest }) => {
  const isManager = currentUser.role === UserRole.MANAGER;
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
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
    
    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
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

    onAddLeaveRequest(newRequest);
    
    // Reset form
    setLeaveType('Annual Leave');
    setReason('');
    setStartDate('');
    setEndDate('');
    setClashWarning(null);
    setIsRequestModalOpen(false);
  };

  const myRequests = useMemo(() => leaveRequests.filter(r => r.userId === currentUser.id).sort((a, b) => b.createdAt - a.createdAt), [leaveRequests, currentUser.id]);
  const pendingRequests = useMemo(() => leaveRequests.filter(r => r.status === 'PENDING').sort((a, b) => a.createdAt - b.createdAt), [leaveRequests]);

  // Combined calendar items (Leaves + Holidays)
  const calendarItems = useMemo(() => {
    const leaves = leaveRequests
      .filter(r => r.status === 'APPROVED' || r.status === 'PENDING')
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

  // Holiday distribution data for chart
  const holidayChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts = months.map(m => ({ month: m, bd: 0, ind: 0 }));
    
    BD_HOLIDAYS.forEach(h => {
      const monthIdx = new Date(h.date).getMonth();
      counts[monthIdx].bd += 1;
    });

    IND_HOLIDAYS.forEach(h => {
      const monthIdx = new Date(h.date).getMonth();
      counts[monthIdx].ind += 1;
    });
    
    return counts;
  }, []);

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
    const dateStr = day.toISOString().split('T')[0];
    
    const leaves = leaveRequests
      .filter(r => (r.status === 'APPROVED' || r.status === 'PENDING') && 
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
    const statusColors = {
      PENDING: 'bg-amber-100 text-amber-700',
      APPROVED: 'bg-emerald-100 text-emerald-700',
      REJECTED: 'bg-red-100 text-red-700'
    };

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
      <div key={req.id} className="p-3 border border-slate-100 rounded-lg mb-3 bg-slate-50">
        <div className="flex justify-between items-start mb-2">
          <span className="font-medium text-sm text-slate-800">{req.userName}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColors[req.status]}`}>
            {req.status}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-1">{req.type} ({req.daysRequested} days)</p>
        <p className="text-xs font-medium text-slate-700 mb-2">{req.startDate} to {req.endDate}</p>
        <p className="text-xs text-slate-600 italic mb-2">"{req.reason}"</p>
        
        {isOverQuota && (
          <div className="bg-red-50 text-red-700 text-xs p-2 rounded mb-2 flex items-start gap-1.5 border border-red-100">
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Agent has used {userTotalDays} days. This request ({req.daysRequested} days) exceeds the {STANDARD_LEAVE_QUOTA}-day quota.</span>
          </div>
        )}

        {showActions && req.status === 'PENDING' && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
            <button onClick={() => handleApprove(req)} className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-1.5 rounded text-xs font-medium transition-colors">Approve</button>
            <button onClick={() => handleReject(req)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-1.5 rounded text-xs font-medium transition-colors">Reject</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Leave & Holidays</h2>
           <p className="text-slate-500 text-sm">Manage holiday requests and view team availability.</p>
        </div>
        {!isManager && (
          <button onClick={() => setIsRequestModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Request Leave
          </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left Column: Interactive Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-50 text-slate-600 transition-colors border-r border-slate-200">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-xs font-medium hover:bg-slate-50 text-slate-600 transition-colors">
                  Today
                </button>
                <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-50 text-slate-600 transition-colors border-l border-slate-200">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Approved
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> BD
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span> IND
              </span>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-slate-100 border border-slate-100 rounded-lg overflow-hidden">
              {daysInMonth.map((day, idx) => {
                const events = day ? getEventsForDay(day) : [];
                const isToday = day && day.toDateString() === new Date().toDateString();
                
                return (
                  <div 
                    key={idx} 
                    className={`min-h-[80px] p-1.5 bg-white flex flex-col gap-1 transition-colors hover:bg-slate-50/50 ${!day ? 'bg-slate-50/30' : ''}`}
                  >
                    {day && (
                      <>
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-bold ${isToday ? 'bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>
                            {day.getDate()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[60px] custom-scrollbar">
                          {events.map((ev, i) => {
                            const isHoliday = 'isHoliday' in ev && ev.isHoliday;
                            const country = 'country' in ev ? ev.country : null;
                            const status = 'status' in ev ? ev.status : null;
                            const title = 'userName' in ev ? ev.userName : ('name' in ev ? ev.name : '');
                            
                            let bgColor = 'bg-blue-50 text-blue-700 border-blue-100';
                            let dotColor = 'bg-blue-500';
                            
                            if (isHoliday) {
                              if (country === 'BD') {
                                bgColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                dotColor = 'bg-emerald-500';
                              } else {
                                bgColor = 'bg-amber-50 text-amber-700 border-amber-100';
                                dotColor = 'bg-amber-600';
                              }
                            } else if (status === 'PENDING') {
                              bgColor = 'bg-amber-50 text-amber-700 border-amber-100';
                              dotColor = 'bg-amber-500';
                            }

                            return (
                              <div 
                                key={i} 
                                className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 truncate font-medium ${bgColor}`}
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

        {/* Right Column: Requests / Upcoming */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">{isManager ? 'Pending Requests' : 'My Requests'}</h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {isManager ? (
              pendingRequests.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm">No pending requests.</p>
                </div>
              ) : (
                pendingRequests.map(req => renderRequestCard(req, true))
              )
            ) : (
              myRequests.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm">No leave requests found.</p>
                </div>
              ) : (
                myRequests.map(req => renderRequestCard(req, false))
              )
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm">Holiday Distribution</h3>
            </div>
            
            <div className="h-32 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={holidayChartData}>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#94a3b8' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                  />
                  <Bar dataKey="bd" fill="#10b981" name="Bangladesh" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="ind" fill="#f59e0b" name="India" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-slate-800 text-sm">Upcoming Holidays</h3>
            </div>
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {[...BD_HOLIDAYS.map(h => ({ ...h, country: 'BD' })), ...IND_HOLIDAYS.map(h => ({ ...h, country: 'IND' }))]
                .filter(h => new Date(h.date).getTime() >= new Date('2026-03-26').getTime())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((h, i) => (
                  <li key={i} className="flex justify-between items-center text-[10px] sm:text-xs p-1.5 rounded hover:bg-slate-100 transition-colors">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span className={`w-1 h-1 rounded-full ${h.country === 'BD' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                      <span className="font-bold text-[8px] text-slate-400">{h.country}</span>
                      {h.name}
                    </span>
                    <span className="font-medium text-slate-800">
                      {new Date(h.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Request Leave Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Request Leave</h3>
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
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveCalendar;
