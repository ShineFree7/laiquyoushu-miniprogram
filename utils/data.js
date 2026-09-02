const EXPENSE_CATEGORIES = [
  { name: '餐饮', icon: '/images/categories/food.png', iconType: 'image', color: '#8D6E63' },
  { name: '水果', icon: '/images/categories/fruit.png', iconType: 'image', color: '#A1887F' },
  { name: '交通', icon: '/images/categories/transport.png', iconType: 'image', color: '#5C6BC0' },
  { name: '购物', icon: '/images/categories/shopping.png', iconType: 'image', color: '#A67C52' },
  { name: '居住', icon: '/images/categories/home.png', iconType: 'image', color: '#5D4037' },
  { name: '娱乐', icon: '/images/categories/fun.png', iconType: 'image', color: '#8B7D6B' },
  { name: '医疗', icon: '/images/categories/medical.png', iconType: 'image', color: '#C9A96E' },
  { name: '教育', icon: '/images/categories/edu.png', iconType: 'image', color: '#78909C' },
  { name: '人情', icon: '/images/categories/gift.png', iconType: 'image', color: '#B08D57', hidden: true },
  { name: '其他', icon: '/images/categories/other.png', iconType: 'image', color: '#6B5B49' }
];

const INCOME_CATEGORIES = [
  { name: '工资', icon: '/images/categories/salary.png', iconType: 'image', color: '#5C6BC0' },
  { name: '奖金', icon: '/images/categories/bonus.png', iconType: 'image', color: '#B08D57' },
  { name: '红包', icon: '/images/categories/redpack.png', iconType: 'image', color: '#8D6E63' },
  { name: '兼职', icon: '/images/categories/job.png', iconType: 'image', color: '#A67C52' },
  { name: '理财', icon: '/images/categories/invest.png', iconType: 'image', color: '#5D4037' },
  { name: '其他', icon: '/images/categories/sparkle.png', iconType: 'image', color: '#6B5B49' }
];

const CATEGORIES = EXPENSE_CATEGORIES.concat(INCOME_CATEGORIES);
const CUSTOM_KEY = 'lqys_custom_categories';
const REMOVED_KEY = 'lqys_removed_categories';

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function fmt(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDate(s) {
  const p = String(s).split('-').map(Number);
  return new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
}

function today() {
  return fmt(new Date());
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

function addMonths(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return fmt(d);
}

function startOfWeek(dateStr) {
  const d = parseDate(dateStr);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return fmt(d);
}

function monthOf(date) {
  return String(date).slice(0, 7);
}

function rangeFor(mode, anchor) {
  const a = anchor || today();
  if (mode === 'week') {
    const start = startOfWeek(a);
    return { start, end: addDays(start, 6) };
  }
  if (mode === 'year') {
    const y = String(a).slice(0, 4);
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  if (mode === 'custom') {
    const parts = String(a).split(',');
    const start = parts[0] || today();
    const end = parts[1] || start;
    return start <= end ? { start, end } : { start: end, end: start };
  }
  const start = `${String(a).slice(0, 7)}-01`;
  return { start, end: addDays(addMonths(start, 1), -1) };
}

function shiftAnchor(mode, anchor, dir) {
  if (mode === 'week') return addDays(anchor, dir * 7);
  if (mode === 'year') return `${Number(String(anchor).slice(0, 4)) + dir}-01-01`;
  if (mode === 'custom') {
    const r = rangeFor(mode, anchor);
    return `${addDays(r.start, dir * 7)},${addDays(r.end, dir * 7)}`;
  }
  return addMonths(anchor, dir);
}

function rangeLabel(range, mode) {
  const s = parseDate(range.start);
  const e = parseDate(range.end);
  if (mode === 'year') return `${s.getFullYear()}年`;
  const sameYear = s.getFullYear() === e.getFullYear();
  const startText = `${s.getMonth() + 1}月${s.getDate()}日`;
  const endText = sameYear
    ? `${e.getMonth() + 1}月${e.getDate()}日`
    : `${e.getFullYear()}年${e.getMonth() + 1}月${e.getDate()}日`;
  if (mode === 'month') return `${s.getFullYear()}年${startText} 至 ${endText}`;
  return `${startText} 至 ${endText}`;
}

function daysInRange(start, end) {
  const s = parseDate(start);
  const e = parseDate(end);
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function dateLabel(dateStr) {
  const d = parseDate(dateStr);
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${week[d.getDay()]}`;
}

function getRecords() {
  const list = wx.getStorageSync('lqys_records');
  return Array.isArray(list) ? list : [];
}

function saveRecord(record) {
  const list = getRecords();
  const item = Object.assign({
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    type: 'expense',
    category: '其他',
    amount: 0,
    note: '',
    date: today()
  }, record, { amount: Number(record.amount) || 0 });
  list.push(item);
  list.sort((a, b) => (a.date < b.date ? 1 : -1));
  wx.setStorageSync('lqys_records', list);
  return item;
}

function deleteRecord(id) {
  wx.setStorageSync('lqys_records', getRecords().filter((item) => item.id !== id));
}

function updateRecord(id, patch) {
  const list = getRecords().map((item) => {
    if (item.id !== id) return item;
    const amount = patch.amount !== undefined ? (Number(patch.amount) || 0) : (Number(item.amount) || 0);
    return Object.assign({}, item, patch, { amount });
  });
  list.sort((a, b) => (a.date < b.date ? 1 : -1));
  wx.setStorageSync('lqys_records', list);
}

function clearRecords() {
  wx.setStorageSync('lqys_records', []);
}

function getCustomCategories() {
  const list = wx.getStorageSync(CUSTOM_KEY);
  return Array.isArray(list) ? list : [];
}

function saveCustomCategories(list) {
  wx.setStorageSync(CUSTOM_KEY, list);
}

function addCustomCategory(cat) {
  const list = getCustomCategories();
  const item = Object.assign({
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    custom: true,
    icon: '/images/categories/tag.png',
    iconType: 'image',
    color: '#6B5B49',
    type: 'expense'
  }, cat);
  list.push(item);
  saveCustomCategories(list);
  return item;
}

function removeCustomCategory(id) {
  saveCustomCategories(getCustomCategories().filter((c) => c.id !== id));
}

function getRemovedCategories() {
  const list = wx.getStorageSync(REMOVED_KEY);
  return Array.isArray(list) ? list : [];
}

function removeDefaultCategory(name) {
  const list = getRemovedCategories();
  if (!list.includes(name)) {
    list.push(name);
    wx.setStorageSync(REMOVED_KEY, list);
  }
}

function activeIcon(icon) {
  return String(icon || '').replace(/\.png$/, '-active.png');
}

function categoriesFor(type) {
  const removed = getRemovedCategories();
  const defaults = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
    .filter((c) => !c.hidden && !removed.includes(c.name));
  return defaults.concat(getCustomCategories().filter((c) => c.type === type))
    .map((c) => Object.assign({ iconType: c.iconType || 'emoji', iconActive: activeIcon(c.icon) }, c));
}

function findCategory(name) {
  const item = CATEGORIES.concat(getCustomCategories()).find((c) => c.name === name);
  return item ? Object.assign({ iconType: item.iconType || 'emoji', iconActive: activeIcon(item.icon) }, item) : null;
}

function summaryInRange(start, end) {
  let income = 0;
  let expense = 0;
  getRecords().forEach((item) => {
    if (item.date < start || item.date > end) return;
    const amount = Number(item.amount) || 0;
    if (item.type === 'income') income += amount;
    else expense += amount;
  });
  return { income, expense, balance: income - expense };
}

function categorySummaryInRange(start, end, type) {
  const map = {};
  getRecords().forEach((item) => {
    if (item.type !== (type || 'expense') || item.date < start || item.date > end) return;
    map[item.category] = (map[item.category] || 0) + (Number(item.amount) || 0);
  });
  return Object.keys(map)
    .map((name) => {
      const cat = findCategory(name) || { name, icon: '/images/categories/other.png', iconType: 'image', color: '#6B5B49' };
      return { name, icon: cat.icon, iconType: cat.iconType || 'emoji', color: cat.color, amount: map[name] };
    })
    .sort((a, b) => b.amount - a.amount);
}

function seriesInRange(start, end) {
  const s = parseDate(start);
  const e = parseDate(end);
  const dayCount = Math.round((e - s) / 86400000) + 1;
  const byDay = dayCount <= 31;
  const map = {};
  getRecords().forEach((item) => {
    if (item.date < start || item.date > end) return;
    const key = byDay ? item.date : monthOf(item.date);
    if (!map[key]) map[key] = { expense: 0, income: 0 };
    const amount = Number(item.amount) || 0;
    if (item.type === 'income') map[key].income += amount;
    else map[key].expense += amount;
  });
  const labels = [];
  const expense = [];
  const income = [];
  if (byDay) {
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const key = fmt(d);
      const row = map[key] || { expense: 0, income: 0 };
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      expense.push(row.expense);
      income.push(row.income);
    }
  } else {
    let cursor = `${s.getFullYear()}-${pad(s.getMonth() + 1)}`;
    const last = `${e.getFullYear()}-${pad(e.getMonth() + 1)}`;
    while (cursor <= last) {
      const row = map[cursor] || { expense: 0, income: 0 };
      labels.push(`${Number(cursor.slice(5, 7))}月`);
      expense.push(row.expense);
      income.push(row.income);
      const d = parseDate(`${cursor}-01`);
      d.setMonth(d.getMonth() + 1);
      cursor = monthOf(fmt(d));
    }
  }
  return { labels, expense, income };
}

function recordSignature(r) {
  return [r.type, r.category, r.amount, r.date, (r.note || '')].join('|');
}

function recordField(raw, keys, fallback) {
  if (raw == null) return fallback;
  for (let i = 0; i < keys.length; i += 1) {
    const v = raw[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
}

function normalizeRecord(raw, index) {
  const typeRaw = String(recordField(raw, ['type', '类型', '收支', 'incomeExpense', 'income', 'expense'], '')).toLowerCase();
  let amount = Number(String(recordField(raw, ['amount', '金额', 'money', 'income', 'expense', '收入', '支出'], '')).replace(/[^\d.\-+]/g, ''));
  let type = '';
  if (typeRaw.includes('收入') || typeRaw === 'in' || typeRaw === 'income' || typeRaw === '+' || typeRaw === '1') type = 'income';
  else if (typeRaw.includes('支出') || typeRaw === 'out' || typeRaw === 'expense' || typeRaw === '-' || typeRaw === '0') type = 'expense';
  if (isNaN(amount)) amount = 0;
  if (!type) type = amount < 0 ? 'expense' : 'income';
  const date = normalizeCsvDate(String(recordField(raw, ['date', '日期', '时间', 'time'], ''))) || today();
  return {
    id: String(recordField(raw, ['id', 'ID', '编号', '序号'], `${Date.now()}-${index || 0}`)),
    type,
    category: String(recordField(raw, ['category', '分类', '类别', '类目', '科目'], '其他')),
    amount: Math.round(Math.abs(amount) * 100) / 100,
    date,
    note: String(recordField(raw, ['note', '备注', '摘要', '说明', '描述'], ''))
  };
}

function exportBackup() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    records: getRecords(),
    customCategories: getCustomCategories(),
    removedCategories: getRemovedCategories()
  };
}

function parseBackupJson(text) {
  const obj = JSON.parse(text);
  const base = Array.isArray(obj) ? { records: obj } : (obj || {});
  const recordKeys = ['records', 'items', 'list', 'bills', 'data', '账目', '账单'];
  let records = [];
  recordKeys.forEach((key) => {
    if (!records.length && Array.isArray(base[key])) records = base[key];
  });
  return {
    records,
    customCategories: Array.isArray(base.customCategories) ? base.customCategories : [],
    removedCategories: Array.isArray(base.removedCategories) ? base.removedCategories : []
  };
}

function csvEscape(value) {
  const s = String(value == null ? '' : value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(records) {
  const lines = [['id', '类型', '分类', '金额', '日期', '备注'].join(',')];
  records.forEach((r) => {
    lines.push([
      r.id,
      r.type === 'income' ? '收入' : '支出',
      r.category,
      Number(r.amount) || 0,
      r.date,
      r.note || ''
    ].map(csvEscape).join(','));
  });
  return `\uFEFF${lines.join('\r\n')}`;
}

function parseCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = raw.split(/\r?\n/).find((l) => l.trim());
  let delim = ',';
  if (firstLine) {
    const counts = [',', ';', '\t'].map((d) => [
      d,
      (firstLine.match(new RegExp(d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    ]);
    counts.sort((a, b) => b[1] - a[1]);
    if (counts[0][1] > 0) delim = counts[0][0];
  }
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = raw;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }
  if (!rows.length) return [];

  const pick = (row, keys) => {
    const lower = row.map((h) => String(h).toLowerCase());
    return lower.findIndex((h) => keys.some((k) => h.includes(k)));
  };
  const headerIndex = rows.findIndex((row) => {
    const count = [
      pick(row, ['日期', '时间', '交易时间', '记账时间', '发生时间', '交易日期', 'date']),
      pick(row, ['金额', '消费金额', '支出金额', '收入金额', 'amount', 'money']),
      pick(row, ['收入', 'income', '入账']),
      pick(row, ['支出', 'expense', '出账', '消费']),
      pick(row, ['收支', '账目', '交易类型', '收支类型', '记账类型', '类型', '类别', '科目', 'type', 'category'])
    ].filter((i) => i >= 0).length;
    return count >= 2;
  });
  if (headerIndex < 0) throw new Error('csv-format');

  const headers = rows[headerIndex].map((h) => h.trim());
  let typeIdx = pick(headers, ['收支', '账目', '交易类型', '收支类型', '记账类型', '类型', '类别', '科目', 'type', 'category']);
  const incomeIdx = pick(headers, ['收入', 'income', '入账']);
  const expenseIdx = pick(headers, ['支出', 'expense', '出账', '消费']);
  const dateIdx = pick(headers, ['日期', '时间', '交易时间', '记账时间', '发生时间', '交易日期', 'date']);
  const amountIdx = pick(headers, ['金额', '消费金额', '支出金额', '收入金额', 'amount', 'money']);
  let categoryIdx = pick(headers, ['分类', '类别', '类目', '科目', '类别名称', '类目名称', 'category', 'categoryname']);
  const noteIdx = pick(headers, ['备注', '摘要', '说明', '描述', '明细', '详情', '交易备注', 'note', 'remark', 'memo', 'comment']);
  const idIdx = pick(headers, ['id', '编号', '序号', '交易号', '流水号']);
  if (categoryIdx === typeIdx) categoryIdx = -1;

  const records = [];
  rows.slice(headerIndex + 1).forEach((r, ri) => {
    const get = (i) => (i >= 0 && r[i] !== undefined ? String(r[i]).trim() : '');
    let type = '';
    if (typeIdx >= 0) {
      const t = get(typeIdx).toLowerCase();
      if (t.includes('收入') || t === 'in' || t === 'income' || t === '+') type = 'income';
      else if (t.includes('支出') || t === 'out' || t === 'expense' || t === '-') type = 'expense';
    }
    let amount = NaN;
    const rawAmount = get(amountIdx).replace(/[^\d.\-+]/g, '');
    if (rawAmount !== '') amount = Number(rawAmount);
    if (isNaN(amount) && (incomeIdx >= 0 || expenseIdx >= 0)) {
      const inc = Number(get(incomeIdx).replace(/[^\d.\-+]/g, ''));
      const exp = Number(get(expenseIdx).replace(/[^\d.\-+]/g, ''));
      if (!isNaN(inc) && inc !== 0) {
        amount = inc;
        if (!type) type = 'income';
      } else if (!isNaN(exp) && exp !== 0) {
        amount = exp;
        if (!type) type = 'expense';
      }
    }
    if (isNaN(amount)) return;
    if (!type) type = amount >= 0 ? 'income' : 'expense';
    amount = Math.abs(amount);
    const date = normalizeCsvDate(get(dateIdx));
    if (!date || isNaN(amount) || amount <= 0) return;
    records.push({
      id: get(idIdx) || `${Date.now()}-${ri}`,
      type,
      category: get(categoryIdx) || '其他',
      amount: Math.round(amount * 100) / 100,
      date,
      note: get(noteIdx)
    });
  });
  return records;
}

function normalizeCsvDate(value) {
  const s = String(value || '').trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const m = s.match(/(\d{4})[年\/\-.](\d{1,2})[月\/\-.](\d{1,2})/);
  if (!m) return '';
  return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
}

function importBackup(backup, mode) {
  const incoming = (backup.records || []).map(normalizeRecord);
  if (mode === 'overwrite') {
    wx.setStorageSync('lqys_records', incoming);
  } else {
    const existing = getRecords();
    const byId = {};
    const sig = {};
    existing.forEach((r) => {
      byId[r.id] = r;
      sig[recordSignature(r)] = true;
    });
    incoming.forEach((r) => {
      if (r.id && byId[r.id]) return;
      const key = recordSignature(r);
      if (sig[key]) return;
      byId[r.id] = r;
      sig[key] = true;
    });
    const merged = Object.keys(byId).map((k) => byId[k]);
    merged.sort((a, b) => (a.date < b.date ? 1 : -1));
    wx.setStorageSync('lqys_records', merged);
  }

  const customIn = (backup.customCategories || []).filter((c) => c && c.name);
  if (mode === 'overwrite') {
    wx.setStorageSync(CUSTOM_KEY, customIn);
  } else {
    const map = {};
    getCustomCategories().forEach((c) => {
      if (c.id) map[c.id] = c;
    });
    customIn.forEach((c) => {
      if (!c.id || !map[c.id]) {
        const id = c.id || `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        map[id] = Object.assign({}, c, { id });
      }
    });
    wx.setStorageSync(CUSTOM_KEY, Object.keys(map).map((k) => map[k]));
  }

  const removedIn = (backup.removedCategories || []).filter(Boolean);
  if (mode === 'overwrite') {
    wx.setStorageSync(REMOVED_KEY, removedIn);
  } else {
    const set = {};
    getRemovedCategories().forEach((n) => {
      set[n] = true;
    });
    removedIn.forEach((n) => {
      set[n] = true;
    });
    wx.setStorageSync(REMOVED_KEY, Object.keys(set));
  }

  return { records: incoming.length };
}

function money(n) {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}

module.exports = {
  CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  today,
  monthOf,
  addDays,
  rangeFor,
  shiftAnchor,
  rangeLabel,
  daysInRange,
  dateLabel,
  getRecords,
  saveRecord,
  deleteRecord,
  updateRecord,
  clearRecords,
  getCustomCategories,
  addCustomCategory,
  removeCustomCategory,
  removeDefaultCategory,
  categoriesFor,
  findCategory,
  activeIcon,
  summaryInRange,
  categorySummaryInRange,
  seriesInRange,
  exportBackup,
  parseBackupJson,
  exportCsv,
  parseCsv,
  importBackup,
  money
};
