function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function buildCalendar(year, month, mode, calDate, weekStart, weekEnd) {
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i += 1) {
    cells.push({ key: cells.length, day: '', value: '', state: '' });
  }
  for (let d = 1; d <= days; d += 1) {
    const value = `${year}-${pad(month)}-${pad(d)}`;
    let state = '';
    if (mode === 'month') {
      if (value === calDate) state = 'selected';
    } else if (mode === 'week') {
      if (weekStart && value >= weekStart && value <= weekEnd) {
        state = value === calDate ? 'selected' : 'in';
      }
    }
    cells.push({ key: cells.length, day: d, value, state });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: cells.length, day: '', value: '', state: '' });
  }
  return cells;
}

function monthTitle(year, month) {
  return `${year}年${month}月`;
}

module.exports = {
  buildCalendar,
  monthTitle
};
