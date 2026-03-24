import React, { useState, useMemo } from 'react';
import { User, UserRole, LeaveRequest, LeaveType } from '../types';

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

  const handleApprove = (req: LeaveRequest) => {
    onUpdateLeaveRequest({ ...req, status: 'APPROVED' });
  };

  const handleReject = (req: LeaveRequest) => {
    onUpdateLeaveRequest({ ...req, status: 'REJECTED' });
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
        {/* Left Column: Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Team Calendar</h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span> Approved Leave
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span> Pending
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span> BD Holiday
              </span>
            </div>
          </div>
          <div className="flex-1 p-6 flex flex-col bg-slate-50/50 overflow-y-auto">
            <div className="space-y-4">
              {leaveRequests.filter(r => r.status === 'APPROVED' || r.status === 'PENDING').length === 0 ? (
                <div className="text-center text-slate-400 py-10">
                  <p className="text-sm">No upcoming leaves scheduled.</p>
                </div>
              ) : (
                leaveRequests
                  .filter(r => r.status === 'APPROVED' || r.status === 'PENDING')
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map(req => (
                    <div key={req.id} className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                      <div className="w-16 flex flex-col items-center justify-center border-r border-slate-100 pr-4">
                        <span className="text-xs font-bold text-slate-500 uppercase">{new Date(req.startDate).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-xl font-black text-slate-800">{new Date(req.startDate).getDate()}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-800">{req.userName}</span>
                          <span className={`w-2 h-2 rounded-full ${req.status === 'APPROVED' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                        </div>
                        <p className="text-sm text-slate-600">{req.type} • {req.daysRequested} days</p>
                        <p className="text-xs text-slate-500 mt-1">Until {new Date(req.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
              )}
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
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Upcoming BD Holidays</h3>
            <ul className="space-y-2">
              <li className="flex justify-between text-xs">
                <span className="text-slate-600">Victory Day</span>
                <span className="font-medium text-slate-800">Dec 16</span>
              </li>
              <li className="flex justify-between text-xs">
                <span className="text-slate-600">Christmas Day</span>
                <span className="font-medium text-slate-800">Dec 25</span>
              </li>
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
