const currencyFormatter = new Intl.NumberFormat('en-IN');

export function formatCurrency(value) {
  return `₹${currencyFormatter.format(Number(value || 0))}`;
}

export function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(Number(ms || 0) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function formatTime(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(name) {
  return String(name || 'VS')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function computeBreakMs(record, nowMs = Date.now()) {
  const breaks = Array.isArray(record?.breaks) ? record.breaks : [];

  return breaks.reduce((sum, item) => {
    if (!item?.startTime) {
      return sum;
    }

    const startTime = new Date(item.startTime).getTime();
    const endTime = item?.endTime ? new Date(item.endTime).getTime() : nowMs;

    return sum + Math.max(0, endTime - startTime);
  }, 0);
}

export function getAttendanceState(attendance) {
  if (!attendance || !attendance.checkInTime) {
    return 'not-started';
  }

  if (attendance.checkOutTime) {
    return 'completed';
  }

  const breaks = Array.isArray(attendance.breaks) ? attendance.breaks : [];
  const latestBreak = breaks[breaks.length - 1];

  if (latestBreak?.startTime && !latestBreak?.endTime) {
    return 'on-break';
  }

  return 'working';
}

export function getAttendanceTone(state, workedLabel) {
  switch (state) {
    case 'working':
      return {
        label: 'Online',
        tone: 'success',
        icon: 'flash',
        actions: [
          { key: 'take-break', label: 'Take break', icon: 'pause-outline' },
          { key: 'check-out', label: 'Check out', icon: 'log-out-outline' },
        ],
      };
    case 'on-break':
      return {
        label: 'On Break',
        tone: 'warning',
        icon: 'cafe-outline',
        actions: [
          { key: 'resume-work', label: 'Resume', icon: 'play-outline' },
          { key: 'check-out', label: 'Check out', icon: 'log-out-outline' },
        ],
      };
    case 'completed':
      return {
        label: `Shift Closed · ${workedLabel}`,
        tone: 'neutral',
        icon: 'checkmark-done-outline',
        actions: [],
      };
    default:
      return {
        label: 'Offline',
        tone: 'danger',
        icon: 'moon-outline',
        actions: [
          { key: 'check-in', label: 'Check in', icon: 'log-in-outline' },
        ],
      };
  }
}

export function summarizeAttendanceRecords(records, nowMs = Date.now()) {
  return (records || []).reduce(
    (summary, record) => {
      const status = record?.status || 'Present';
      const workingMs = Number(
        record?.totalWorkingMsLive ?? record?.totalWorkingMs ?? 0
      );
      const breakMs = Number(record?.totalBreakMsLive ?? computeBreakMs(record, nowMs));

      if (status === 'Absent') {
        summary.absentDays += 1;
      } else if (status === 'Leave') {
        summary.leaveDays += 1;
      } else {
        summary.presentDays += 1;
      }

      summary.totalWorkingMs += workingMs;
      summary.totalBreakMs += breakMs;

      return summary;
    },
    {
      presentDays: 0,
      absentDays: 0,
      leaveDays: 0,
      totalWorkingMs: 0,
      totalBreakMs: 0,
    }
  );
}
