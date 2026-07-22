import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "text-slate-600 hover:bg-slate-100 focus:ring-slate-400",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`} {...props}>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray' }> = ({ children, color = 'gray' }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-rose-100 text-rose-800",
    yellow: "bg-amber-100 text-amber-800",
    gray: "bg-slate-100 text-slate-800",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

// --- Design-system shared components (see design handoff README) ---

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  delta?: { text: string; tone: 'success' | 'danger' };
  subtext?: string;
  tone?: 'default' | 'danger';
}> = ({ label, value, delta, subtext, tone = 'default' }) => (
  <div className={`bg-surface rounded-card p-4 shadow-sm ${tone === 'danger' ? 'border border-danger-bg' : ''}`}>
    <div className={`text-[10.5px] font-bold uppercase tracking-wide ${tone === 'danger' ? 'text-danger-text' : 'text-ink-muted'}`}>
      {label}
    </div>
    <div className="flex items-baseline gap-1.5 mt-1">
      <div className={`text-2xl font-extrabold ${tone === 'danger' ? 'text-danger-text' : 'text-ink'}`}>{value}</div>
      {delta && (
        <span className={`text-[11px] font-bold ${delta.tone === 'success' ? 'text-success-text' : 'text-danger-text'}`}>
          {delta.text}
        </span>
      )}
    </div>
    {subtext && <div className="text-[11px] text-ink-muted mt-2.5">{subtext}</div>}
  </div>
);

export const FlowBar: React.FC<{
  segments: Array<{ label: string; count: number; colorClass: string }>;
  height?: number;
  showLegend?: boolean;
}> = ({ segments, height = 16, showLegend = true }) => {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  return (
    <div>
      <div className="flex rounded-md overflow-hidden gap-0.5" style={{ height }}>
        {segments.map((s, i) => (
          <div
            key={i}
            className={s.colorClass}
            title={`${s.label} · ${s.count}`}
            style={{ flex: total > 0 ? s.count || 0.001 : 1 }}
          />
        ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-4 mt-2">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
              <span className={`w-2 h-2 rounded-sm ${s.colorClass}`}></span>
              {s.label} · {s.count}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const NeedsAttentionRow: React.FC<{
  chip: { label: string; tone: 'danger' | 'warning' };
  title: string;
  meta: string;
  action?: { label: string; emphasis?: boolean; onClick: () => void };
  onClick?: () => void;
}> = ({ chip, title, meta, action, onClick }) => {
  const toneStyles = chip.tone === 'danger'
    ? { bg: 'bg-danger-bg', chipBg: 'bg-danger', metaText: 'text-danger-text' }
    : { bg: 'bg-warning-bg', chipBg: 'bg-warning', metaText: 'text-warning-text' };
  return (
    <div
      className={`flex items-center gap-3 ${toneStyles.bg} rounded-lg px-3.5 py-2.5 ${onClick ? 'cursor-pointer hover:brightness-[0.98]' : ''}`}
      onClick={onClick}
    >
      <span className={`text-[9.5px] font-extrabold text-white ${toneStyles.chipBg} px-2 py-1 rounded tracking-wide flex-shrink-0`}>
        {chip.label}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-ink truncate">{title}</div>
        <div className={`text-[11px] mt-0.5 ${toneStyles.metaText}`}>{meta}</div>
      </div>
      {action && (
        <button
          onClick={(e) => { e.stopPropagation(); action.onClick(); }}
          className={`text-[11.5px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0 ${
            action.emphasis ? 'bg-ink text-white' : 'bg-white text-ink-secondary hover:bg-slate-50'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export const LoadBar: React.FC<{
  name: string;
  avatar?: string;
  count: number;
  maxCount: number;
}> = ({ name, avatar, count, maxCount }) => {
  const pct = maxCount > 0 ? Math.min((count / maxCount) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      {avatar ? (
        <img src={avatar} alt="" className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {name.charAt(0)}
        </div>
      )}
      <span className="text-[11.5px] text-ink-secondary whitespace-nowrap">{name}</span>
      <div className="h-[5px] flex-1 min-w-[40px] bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold text-ink-secondary flex-shrink-0">{count}</span>
    </div>
  );
};

export const PillSegmentedControl: React.FC<{
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex bg-slate-100 rounded-lg p-1">
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-md transition-colors ${
          value === opt.value ? 'bg-white text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export const StatusDot: React.FC<{ colorClass: string; label: string }> = ({ colorClass, label }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
    <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
    {label}
  </span>
);

export const MiniMonthCalendar: React.FC<{
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  events: Record<string, { colorClass: string; label?: string }[]>; // key: 'YYYY-MM-DD'
}> = ({ month, onPrevMonth, onNextMonth, events }) => {
  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === monthIdx && today.getDate() === day;
  const dateKey = (day: number) => `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <div className="flex justify-between items-center mb-2.5">
        <div className="text-sm font-bold text-ink">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <div className="flex gap-1">
          <button onClick={onPrevMonth} className="w-[18px] h-[18px] rounded bg-slate-100 text-ink-muted text-[10px] flex items-center justify-center hover:bg-slate-200">‹</button>
          <button onClick={onNextMonth} className="w-[18px] h-[18px] rounded bg-slate-100 text-ink-muted text-[10px] flex items-center justify-center hover:bg-slate-200">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[3px] text-center text-[9px] font-bold text-ink-muted mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-[3px] text-center">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="h-[22px]" />;
          const dayEvents = events[dateKey(day)] || [];
          return (
            <div key={i} className="h-[22px] flex flex-col items-center justify-center relative" title={dayEvents.map(e => e.label).filter(Boolean).join(', ')}>
              {isToday(day) ? (
                <span className="w-[18px] h-[18px] rounded-full bg-accent text-white text-[10px] font-extrabold flex items-center justify-center">{day}</span>
              ) : (
                <span className="text-[10px] text-ink-secondary">{day}</span>
              )}
              {dayEvents.length > 0 && !isToday(day) && (
                <span className={`absolute bottom-0 w-1 h-1 rounded-full ${dayEvents[0].colorClass}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};