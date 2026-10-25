import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  User, 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Filter, 
  ExternalLink, 
  Bell, 
  RotateCcw,
  Search,
  Check
} from 'lucide-react';
import { api } from '../../api/client';

export default function CalendarView({
  matters = [],
  activeMatter = null,
  onSelectMatter,
  setActiveTab,
  showToast
}) {
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'agenda'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hearings, setHearings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterCourt, setFilterCourt] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedHearing, setSelectedHearing] = useState(null);
  const [showHearingDetailModal, setShowHearingDetailModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hearing Form State
  const [formData, setFormData] = useState({
    matterId: activeMatter?.id || (matters[0]?.id || ''),
    hearingType: 'Arguments',
    date: new Date().toISOString().slice(0, 10),
    time: '10:30',
    court: 'High Court of Delhi',
    location: 'Courtroom 4, Main Block',
    judge: "Hon'ble Presiding Bench",
    priority: 'High',
    notes: '',
    reminder1Day: true,
    reminder3Days: true,
    reminder7Days: false
  });

  // Outcome / Reschedule state for detail modal
  const [editOutcome, setEditOutcome] = useState('');
  const [editStatus, setEditStatus] = useState('Scheduled');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:30');

  useEffect(() => {
    loadHearingsAndReminders();
  }, []);

  const loadHearingsAndReminders = async () => {
    setIsLoading(true);
    try {
      const [hearingsRes, remindersRes] = await Promise.all([
        api.getHearings(),
        api.getReminders()
      ]);

      if (hearingsRes.success) {
        setHearings(hearingsRes.data || []);
      }
      if (remindersRes.success) {
        setReminders(remindersRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load hearings/reminders:', err);
      if (showToast) showToast(`Could not load calendar: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Month navigation helpers
  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setMonth(next.getMonth() + 1);
      setCurrentDate(next);
    }
  };

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    } else {
      const prev = new Date(currentDate);
      prev.setMonth(prev.getMonth() - 1);
      setCurrentDate(prev);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Month Grid Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Filtered hearings
  const filteredHearings = hearings.filter(h => {
    const matchesCourt = filterCourt === 'ALL' || (h.court || '').toLowerCase().includes(filterCourt.toLowerCase());
    const matchesType = filterType === 'ALL' || h.hearingType === filterType;
    const matchesStatus = filterStatus === 'ALL' || h.status === filterStatus;
    const matchesSearch = !searchQuery || 
      (h.matterTitle + ' ' + (h.caseNumber || '') + ' ' + (h.notes || '') + ' ' + (h.court || ''))
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    return matchesCourt && matchesType && matchesStatus && matchesSearch;
  });

  // Get hearings for a specific date (YYYY-MM-DD)
  const getHearingsForDate = (dateStr) => {
    return filteredHearings.filter(h => {
      const hDate = (h.date || h.hearingDate || '').slice(0, 10);
      return hDate === dateStr;
    });
  };

  // Week View Calculation
  const getWeekDates = () => {
    const curr = new Date(currentDate);
    const day = curr.getDay(); // 0 is Sunday
    const start = new Date(curr);
    start.setDate(curr.getDate() - day); // Sunday

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      week.push(d);
    }
    return week;
  };

  // Handle Schedule Hearing Submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.matterId || !formData.date) {
      if (showToast) showToast('Matter and Hearing Date are required.', 'error');
      return;
    }

    const reminderDays = [];
    if (formData.reminder1Day) reminderDays.push(1);
    if (formData.reminder3Days) reminderDays.push(3);
    if (formData.reminder7Days) reminderDays.push(7);

    setIsSubmitting(true);
    try {
      const res = await api.createHearing({
        matterId: formData.matterId,
        hearingType: formData.hearingType,
        date: formData.date,
        time: formData.time,
        court: formData.court,
        location: formData.location,
        judge: formData.judge,
        priority: formData.priority,
        notes: formData.notes,
        reminderDays
      });

      if (res.success) {
        if (showToast) showToast(`Hearing scheduled with ${res.remindersScheduled || 0} in-app reminder(s).`, 'success');
        setShowScheduleModal(false);
        loadHearingsAndReminders();
      }
    } catch (err) {
      if (showToast) showToast(`Scheduling failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Hearing Status / Reschedule Update
  const handleUpdateHearingDetails = async () => {
    if (!selectedHearing) return;
    setIsSubmitting(true);
    try {
      const updates = {
        outcome: editOutcome,
        status: editStatus
      };
      if (rescheduleDate) {
        updates.date = rescheduleDate;
        updates.time = rescheduleTime;
      }

      const res = await api.updateHearing(selectedHearing.id, updates);
      if (res.success) {
        if (showToast) showToast('Hearing updated successfully.', 'success');
        setShowHearingDetailModal(false);
        setSelectedHearing(null);
        loadHearingsAndReminders();
      }
    } catch (err) {
      if (showToast) showToast(`Update failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Hearing
  const handleDeleteHearing = async (hearingId) => {
    if (!window.confirm('Are you sure you want to cancel and delete this court hearing? Linked reminders will be removed.')) {
      return;
    }
    try {
      const res = await api.deleteHearing(hearingId);
      if (res.success) {
        if (showToast) showToast('Hearing cancelled and removed.', 'info');
        setShowHearingDetailModal(false);
        setSelectedHearing(null);
        loadHearingsAndReminders();
      }
    } catch (err) {
      if (showToast) showToast(`Failed to delete hearing: ${err.message}`, 'error');
    }
  };

  // Open hearing details modal
  const openHearingDetails = (h) => {
    setSelectedHearing(h);
    setEditOutcome(h.outcome || '');
    setEditStatus(h.status || 'Scheduled');
    setRescheduleDate((h.date || h.hearingDate || '').slice(0, 10));
    setRescheduleTime(h.time || '10:30');
    setShowHearingDetailModal(true);
  };

  // Status badge style helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', color: '#34D399', label: 'Completed' };
      case 'Postponed':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', color: '#FBBF24', label: 'Postponed / Adjourned' };
      case 'Cancelled':
        return { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', color: '#F87171', label: 'Cancelled' };
      case 'In Progress':
        return { bg: 'rgba(56, 189, 248, 0.15)', border: '#38BDF8', color: '#38BDF8', label: 'In Progress / Part-Heard' };
      default:
        return { bg: 'rgba(212, 175, 55, 0.15)', border: 'var(--gold-primary)', color: 'var(--gold-light)', label: 'Scheduled' };
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekDates = getWeekDates();

  return (
    <div style={{
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      overflowY: 'auto',
      height: '100%',
      backgroundColor: 'var(--bg-primary)'
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-gold">COURT CALENDAR</span>
            <span className="badge badge-info">India Standard Time (IST UTC+5:30)</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: '#FFF', fontWeight: 700 }}>
            Hearing Calendar & Judicial Reminders
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Track court appearances, arguments, bail applications, and compliance deadlines across Indian High Courts and Tribunals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => {
              setFormData({
                matterId: activeMatter?.id || (matters[0]?.id || ''),
                hearingType: 'Arguments',
                date: new Date().toISOString().slice(0, 10),
                time: '10:30',
                court: activeMatter?.court || 'High Court of Delhi',
                location: 'Courtroom 4, Main Block',
                judge: activeMatter?.judge || "Hon'ble Presiding Bench",
                priority: 'High',
                notes: '',
                reminder1Day: true,
                reminder3Days: true,
                reminder7Days: false
              });
              setShowScheduleModal(true);
            }}
            className="btn btn-gold"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Schedule Hearing</span>
          </button>
        </div>
      </div>

      {/* Due Reminders Notification Strip */}
      {reminders.filter(r => r.status === 'Due' || !r.isRead).length > 0 && (
        <div style={{
          backgroundColor: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid var(--border-gold)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(212, 175, 55, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gold-light)'
            }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF' }}>
                {reminders.filter(r => r.status === 'Due').length} Due Court Hearing Reminder(s)
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--gold-muted)' }}>
                In-app notification scheduled. Review cause lists and briefing paper books for upcoming hearings.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {reminders.filter(r => r.status === 'Due' || !r.isRead).slice(0, 2).map(r => (
              <div
                key={r.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ color: 'var(--gold-light)', fontWeight: 500 }}>{r.title}</span>
                <button
                  onClick={async () => {
                    await api.markReminderRead(r.id);
                    loadHearingsAndReminders();
                    if (showToast) showToast('Reminder marked as read.', 'info');
                  }}
                  title="Mark as read"
                  style={{ background: 'transparent', border: 'none', color: '#10B981', cursor: 'pointer', padding: 0 }}
                >
                  <Check size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Controls & Filters Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        backgroundColor: 'var(--bg-secondary)',
        padding: '0.85rem 1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Date Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              onClick={prevPeriod}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
              title="Previous Period"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToToday}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            >
              Today
            </button>
            <button
              onClick={nextPeriod}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
              title="Next Period"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <h3 style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--gold-light)',
            fontFamily: 'var(--font-serif)',
            minWidth: '180px',
            margin: 0
          }}>
            {viewMode === 'month' && `${monthNames[month]} ${year}`}
            {viewMode === 'week' && `Week of ${weekDates[0].toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            {viewMode === 'agenda' && `Hearing Docket Agenda`}
          </h3>
        </div>

        {/* View Mode Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-surface)',
          padding: '0.2rem',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)'
        }}>
          {['month', 'week', 'agenda'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                background: viewMode === mode ? 'var(--gold-gradient)' : 'transparent',
                color: viewMode === mode ? '#0B1120' : 'var(--text-secondary)',
                fontWeight: viewMode === mode ? 700 : 500,
                border: 'none',
                borderRadius: '4px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                textTransform: 'capitalize',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Filter Selectors */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search docket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="legal-input"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem 0.35rem 1.8rem', width: '150px' }}
            />
            <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <select
            value={filterCourt}
            onChange={(e) => setFilterCourt(e.target.value)}
            className="legal-select"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', width: 'auto' }}
          >
            <option value="ALL">All Courts</option>
            <option value="Delhi">Delhi High Court</option>
            <option value="Bombay">Bombay High Court</option>
            <option value="Supreme">Supreme Court</option>
            <option value="Tribunal">Tribunals</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="legal-select"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', width: 'auto' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Postponed">Postponed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* VIEW: MONTH GRID */}
      {viewMode === 'month' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden'
        }}>
          {/* Day Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            textAlign: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--gold-light)',
            padding: '0.65rem 0'
          }}>
            <div>Sunday</div>
            <div>Monday</div>
            <div>Tuesday</div>
            <div>Wednesday</div>
            <div>Thursday</div>
            <div>Friday</div>
            <div>Saturday</div>
          </div>

          {/* Month Cells Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridAutoRows: 'minmax(110px, auto)'
          }}>
            {/* Prev month tail days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const dayNum = daysInPrevMonth - firstDayIndex + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  style={{
                    borderRight: '1px solid var(--border-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                    padding: '0.5rem',
                    backgroundColor: 'rgba(6, 10, 18, 0.4)',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem'
                  }}
                >
                  <span>{dayNum}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const dayHearings = getHearingsForDate(dateStr);

              return (
                <div
                  key={`day-${dayNum}`}
                  style={{
                    borderRight: '1px solid var(--border-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                    padding: '0.5rem',
                    backgroundColor: isToday ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
                    position: 'relative',
                    minHeight: '110px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      date: dateStr,
                      matterId: activeMatter?.id || prev.matterId
                    }));
                    setShowScheduleModal(true);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isToday ? 'rgba(212, 175, 55, 0.1)' : 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isToday ? 'rgba(212, 175, 55, 0.05)' : 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: isToday ? 700 : 500,
                      backgroundColor: isToday ? 'var(--gold-primary)' : 'transparent',
                      color: isToday ? '#0B1120' : 'var(--text-primary)'
                    }}>
                      {dayNum}
                    </span>

                    {dayHearings.length > 0 && (
                      <span className="badge badge-gold" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                        {dayHearings.length}
                      </span>
                    )}
                  </div>

                  {/* Hearing Badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
                    {dayHearings.map(h => {
                      const badge = getStatusBadge(h.status);
                      return (
                        <div
                          key={h.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openHearingDetails(h);
                          }}
                          style={{
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.color,
                            borderRadius: '4px',
                            padding: '0.25rem 0.4rem',
                            fontSize: '0.68rem',
                            lineHeight: 1.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={`${h.time || '10:30'} | ${h.hearingType} | ${h.matterTitle} (${h.court})`}
                        >
                          <strong>{h.time || '10:30'}</strong> {h.hearingType}: {h.matterTitle}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: WEEK SCHEDULE */}
      {viewMode === 'week' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.75rem',
          overflowX: 'auto'
        }}>
          {weekDates.map(dateObj => {
            const dateStr = dateObj.toISOString().slice(0, 10);
            const isToday = dateStr === todayStr;
            const dayHearings = getHearingsForDate(dateStr);

            return (
              <div
                key={dateStr}
                className="legal-card"
                style={{
                  minWidth: '150px',
                  borderColor: isToday ? 'var(--gold-primary)' : 'var(--border-subtle)',
                  backgroundColor: isToday ? 'rgba(212, 175, 55, 0.04)' : 'var(--bg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0.75rem'
                }}
              >
                <div style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '0.5rem',
                  marginBottom: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {dateObj.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: isToday ? 'var(--gold-light)' : '#FFF'
                  }}>
                    {dateObj.getDate()} {dateObj.toLocaleDateString('en-IN', { month: 'short' })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  {dayHearings.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: 'auto 0' }}>
                      No hearings scheduled
                    </div>
                  ) : (
                    dayHearings.map(h => {
                      const badge = getStatusBadge(h.status);
                      return (
                        <div
                          key={h.id}
                          onClick={() => openHearingDetails(h)}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: `1px solid ${badge.border}`,
                            backgroundColor: badge.bg,
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: badge.color, fontWeight: 700 }}>
                            <span>{h.time || '10:30'}</span>
                            <span>{h.status}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#FFF', margin: '0.2rem 0' }}>
                            {h.hearingType}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.matterTitle}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            📍 {h.location || h.court}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  onClick={() => {
                    setFormData(prev => ({ ...prev, date: dateStr, matterId: activeMatter?.id || prev.matterId }));
                    setShowScheduleModal(true);
                  }}
                  className="btn btn-outline"
                  style={{ marginTop: '0.75rem', fontSize: '0.68rem', padding: '0.25rem' }}
                >
                  <Plus size={12} /> Add Hearing
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: AGENDA LIST */}
      {viewMode === 'agenda' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredHearings.length === 0 ? (
            <div className="legal-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Scale size={36} color="var(--gold-primary)" style={{ margin: '0 auto 0.75rem', opacity: 0.8 }} />
              <h4 style={{ fontSize: '1rem', color: '#FFF', marginBottom: '0.3rem' }}>
                No hearings found matching filters
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Schedule court hearings to populate your judicial agenda.
              </p>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="btn btn-gold"
                style={{ marginTop: '1rem' }}
              >
                <Plus size={15} /> Schedule Court Hearing
              </button>
            </div>
          ) : (
            filteredHearings.map(h => {
              const badge = getStatusBadge(h.status);
              const isPast = new Date(h.date || h.hearingDate) < new Date(todayStr);

              return (
                <div
                  key={h.id}
                  className="legal-card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    borderLeft: `4px solid ${badge.border}`
                  }}
                >
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    <div style={{
                      textAlign: 'center',
                      minWidth: '70px',
                      padding: '0.5rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gold-light)', fontWeight: 600 }}>
                        {new Date(h.date || h.hearingDate).toLocaleDateString('en-IN', { month: 'short' })}
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#FFF' }}>
                        {new Date(h.date || h.hearingDate).getDate()}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {h.time || '10:30'}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className="badge badge-gold font-mono" style={{ fontSize: '0.68rem' }}>
                          {h.caseNumber || 'CASE'}
                        </span>
                        <span style={{
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          fontSize: '0.65rem',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          {badge.label}
                        </span>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                          {h.hearingType}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#FFF', margin: '0 0 0.25rem 0' }}>
                        {h.matterTitle}
                      </h4>

                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span>🏛️ {h.court}</span>
                        <span>📍 {h.location || 'Courtroom 4'}</span>
                        <span>👨‍⚖️ {h.judge || "Hon'ble Bench"}</span>
                      </div>

                      {h.notes && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontStyle: 'italic' }}>
                          "{h.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => openHearingDetails(h)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      <span>Update / Reschedule</span>
                    </button>

                    <button
                      onClick={() => {
                        const targetM = matters.find(m => m.id === h.matterId);
                        if (targetM && onSelectMatter) {
                          onSelectMatter(targetM);
                        } else if (setActiveTab) {
                          setActiveTab('matters');
                        }
                      }}
                      className="btn btn-outline-gold"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      <span>Open Matter</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SCHEDULE HEARING MODAL */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(6, 10, 18, 0.85)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-gold)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '580px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarIcon size={18} color="var(--gold-primary)" />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--gold-light)', margin: 0 }}>
                  Schedule Court Hearing
                </h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Target Matter *
                </label>
                <select
                  required
                  className="legal-select"
                  value={formData.matterId}
                  onChange={(e) => {
                    const m = matters.find(item => item.id === e.target.value);
                    setFormData({
                      ...formData,
                      matterId: e.target.value,
                      court: m?.court || formData.court,
                      judge: m?.judge || formData.judge
                    });
                  }}
                >
                  <option value="">Select a matter docket...</option>
                  {matters.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.matterNumber || 'CASE'} - {m.title} ({m.client})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Hearing Type *
                  </label>
                  <select
                    className="legal-select"
                    value={formData.hearingType}
                    onChange={(e) => setFormData({ ...formData, hearingType: e.target.value })}
                  >
                    <option value="Arguments">Arguments</option>
                    <option value="Bail Application">Bail Application</option>
                    <option value="Framing of Issues">Framing of Issues</option>
                    <option value="Cross Examination">Cross Examination</option>
                    <option value="Evidence Presentation">Evidence Presentation (BSA Sec 63)</option>
                    <option value="Interlocutory Application">Interlocutory Application (IA)</option>
                    <option value="Case Management Conference">Case Management Conference (CMC)</option>
                    <option value="Final Hearing">Final Hearing</option>
                    <option value="Judgment / Order">Pronouncement of Order</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Priority
                  </label>
                  <select
                    className="legal-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Urgent">Urgent (Injunction / Bail)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Hearing Date * (IST)
                  </label>
                  <input
                    type="date"
                    required
                    className="legal-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Court Sitting Time
                  </label>
                  <input
                    type="time"
                    className="legal-input"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Court / Forum
                  </label>
                  <input
                    type="text"
                    className="legal-input"
                    value={formData.court}
                    onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                    placeholder="e.g. High Court of Delhi"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Courtroom / Bench
                  </label>
                  <input
                    type="text"
                    className="legal-input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Courtroom 4, Main Block"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Presiding Judge(s)
                </label>
                <input
                  type="text"
                  className="legal-input"
                  value={formData.judge}
                  onChange={(e) => setFormData({ ...formData, judge: e.target.value })}
                  placeholder="e.g. Hon'ble Commercial Division Bench"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Preparation Notes & Instructions
                </label>
                <textarea
                  className="legal-textarea"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Items to prepare: Order 39 application, case compendium, Section 63 BSA electronic certificate..."
                />
              </div>

              {/* In-App Reminders Config */}
              <div style={{
                backgroundColor: 'rgba(212, 175, 55, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '0.75rem'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold-light)', marginBottom: '0.4rem' }}>
                  Automated Judicial Reminders (In-App)
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.reminder1Day}
                      onChange={(e) => setFormData({ ...formData, reminder1Day: e.target.checked })}
                    />
                    1 Day Before
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.reminder3Days}
                      onChange={(e) => setFormData({ ...formData, reminder3Days: e.target.checked })}
                    />
                    3 Days Before
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.reminder7Days}
                      onChange={(e) => setFormData({ ...formData, reminder7Days: e.target.checked })}
                    />
                    7 Days Before
                  </label>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  * Reminders trigger in-app alerts on your Dashboard and Calendar (External email/SMS delivery unconfigured).
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-gold"
                >
                  {isSubmitting ? 'Scheduling...' : 'Confirm & Schedule Hearing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEARING DETAILS / RESCHEDULE / OUTCOME MODAL */}
      {showHearingDetailModal && selectedHearing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(6, 10, 18, 0.85)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-gold)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '540px',
            padding: '1.5rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <span className="badge badge-gold font-mono" style={{ fontSize: '0.68rem', marginBottom: '0.3rem', display: 'inline-block' }}>
                  {selectedHearing.caseNumber || 'CASE'}
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFF', margin: 0 }}>
                  {selectedHearing.hearingType} - {selectedHearing.matterTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowHearingDetailModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-surface)',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                <div style={{ fontWeight: 600, color: 'var(--gold-light)' }}>
                  {selectedHearing.date || selectedHearing.hearingDate?.slice(0, 10)} at {selectedHearing.time || '10:30'} IST
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Courtroom / Bench:</span>
                <div style={{ fontWeight: 600, color: '#FFF' }}>
                  {selectedHearing.location || 'Courtroom 4'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Court:</span>
                <div style={{ fontWeight: 500, color: '#FFF' }}>
                  {selectedHearing.court}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Presiding Judge:</span>
                <div style={{ fontWeight: 500, color: '#FFF' }}>
                  {selectedHearing.judge || "Hon'ble Bench"}
                </div>
              </div>
            </div>

            {/* Hearing Status Update */}
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Hearing Status
              </label>
              <select
                className="legal-select"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress / Part-Heard</option>
                <option value="Completed">Completed (Order Pronounced / Passed)</option>
                <option value="Postponed">Postponed / Adjourned to New Date</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Reschedule Date & Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Reschedule Date
                </label>
                <input
                  type="date"
                  className="legal-input"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Sitting Time
                </label>
                <input
                  type="time"
                  className="legal-input"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>
            </div>

            {/* Hearing Outcome Notes */}
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Hearing Outcome / Court Proceedings Summary
              </label>
              <textarea
                className="legal-textarea"
                rows={2}
                value={editOutcome}
                onChange={(e) => setEditOutcome(e.target.value)}
                placeholder="e.g. Interim injunction granted under Order 39. Counter-affidavit to be filed in 2 weeks..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => handleDeleteHearing(selectedHearing.id)}
                className="btn btn-danger"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                Cancel Hearing
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const targetM = matters.find(m => m.id === selectedHearing.matterId);
                    if (targetM && onSelectMatter) {
                      setShowHearingDetailModal(false);
                      onSelectMatter(targetM);
                    }
                  }}
                  className="btn btn-outline-gold"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  Open Matter
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleUpdateHearingDetails}
                  className="btn btn-gold"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.9rem' }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
