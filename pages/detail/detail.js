const data = require('../../utils/data.js');
const calendar = require('../../utils/calendar.js');
const theme = require('../../utils/theme.js');

Page({
  data: {
    theme: 'theme1',
    themeClass: 'theme-1',
    mode: 'month',
    anchor: data.today(),
    range: { start: '', end: '' },
    title: '',
    summary: { expenseText: '0.00', incomeText: '0.00', balanceText: '0.00' },
    groups: [],
    calWeek: ['日', '一', '二', '三', '四', '五', '六'],
    edit: {
      show: false,
      id: '',
      type: 'expense',
      category: '',
      categories: [],
      categoryIndex: 0,
      amount: '',
      date: '',
      note: ''
    },
    picker: {
      show: false,
      mode: 'month',
      month: '',
      calYear: 0,
      calMonth: 0,
      calCells: [],
      calTitle: '',
      calDate: '',
      weekDate: '',
      year: '',
      years: [],
      yearIndex: 0,
      scrollInto: '',
      start: '',
      end: '',
      customTarget: 'start',
      customCalOpen: false,
      startCal: { year: 0, month: 0, date: '', cells: [], title: '' },
      endCal: { year: 0, month: 0, date: '', cells: [], title: '' }
    }
  },

  onShow() {
    theme.applyTheme(this);
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, show: true });
    }
    this.refresh();
  },

  onHide() {
    this.setData({ 'picker.show': false, 'edit.show': false });
    this.setTabBarVisible(true);
  },

  setTabBarVisible(visible) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ show: visible });
    }
  },

  refresh() {
    const range = data.rangeFor(this.data.mode, this.data.anchor);
    const summary = data.summaryInRange(range.start, range.end);
    const map = {};
    data.getRecords().forEach((item) => {
      if (item.date < range.start || item.date > range.end) return;
      const cat = data.findCategory(item.category) || { icon: '/images/categories/other.png', iconType: 'image', color: '#6B5B49' };
      (map[item.date] = map[item.date] || []).push(Object.assign({}, item, {
        icon: cat.icon,
        iconType: cat.iconType || 'emoji',
        color: cat.color,
        amountText: data.money(item.amount)
      }));
    });
    const groups = Object.keys(map)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => {
        const records = map[date];
        const expense = records
          .filter((r) => r.type === 'expense')
          .reduce((s, r) => s + (Number(r.amount) || 0), 0);
        const income = records
          .filter((r) => r.type === 'income')
          .reduce((s, r) => s + (Number(r.amount) || 0), 0);
        return {
          date,
          label: data.dateLabel(date),
          expenseText: data.money(expense),
          incomeText: data.money(income),
          records
        };
      });
    this.setData({
      range,
      title: data.rangeLabel(range, this.data.mode),
      summary: {
        expenseText: data.money(summary.expense),
        incomeText: data.money(summary.income),
        balanceText: data.money(summary.balance)
      },
      groups
    });
  },

  shiftRange(e) {
    const dir = Number(e.currentTarget.dataset.dir);
    this.setData({ anchor: data.shiftAnchor(this.data.mode, this.data.anchor, dir) });
    this.refresh();
  },

  openPicker() {
    const anchorDate = String(this.data.anchor).slice(0, 10);
    const parts = anchorDate.split('-').map(Number);
    const y = Number(String(this.data.anchor).slice(0, 4));
    const years = [];
    for (let i = 1900; i <= 2100; i += 1) years.push(String(i));
    const yearIndex = Math.max(0, years.indexOf(String(y)));
    this.setData({
      'picker.show': true,
      'picker.mode': this.data.mode,
      'picker.month': String(this.data.anchor).slice(0, 7),
      'picker.calYear': parts[0],
      'picker.calMonth': parts[1],
      'picker.calDate': anchorDate,
      'picker.weekDate': anchorDate,
      'picker.year': String(this.data.anchor).slice(0, 4),
      'picker.years': years,
      'picker.yearIndex': yearIndex,
      'picker.scrollInto': `year-${y}`,
      'picker.start': this.data.range.start,
      'picker.end': this.data.range.end
    });
    const start = this.data.range.start || data.today();
    const end = this.data.range.end || start;
    const sp = String(start).split('-').map(Number);
    const ep = String(end).split('-').map(Number);
    this.setData({
      'picker.customTarget': 'start',
      'picker.startCal': { year: sp[0], month: sp[1], date: start, cells: [], title: '' },
      'picker.endCal': { year: ep[0], month: ep[1], date: end, cells: [], title: '' }
    });
    this.rebuildCal();
    this.setTabBarVisible(false);
  },

  closePicker() {
    this.setData({ 'picker.show': false });
    this.setTabBarVisible(true);
  },

  noop() {},

  onPickMode(e) {
    this.setData({ 'picker.mode': e.currentTarget.dataset.mode });
    this.rebuildCal();
  },

  onCustomTarget(e) {
    const target = e.currentTarget.dataset.target;
    const date = target === 'start' ? this.data.picker.start : this.data.picker.end;
    const parts = String(date).split('-').map(Number);
    const key = target === 'start' ? 'startCal' : 'endCal';
    this.setData({
      'picker.customTarget': target,
      'picker.customCalOpen': true,
      [`picker.${key}.year`]: parts[0],
      [`picker.${key}.month`]: parts[1],
      [`picker.${key}.date`]: date
    });
    this.rebuildCal();
  },

  closeCustomCal() {
    this.setData({ 'picker.customCalOpen': false });
  },

  confirmCustomCal() {
    const p = this.data.picker;
    const key = p.customTarget === 'start' ? 'startCal' : 'endCal';
    const date = p[key].date;
    if (!date) return;
    this.setData({
      'picker.customCalOpen': false,
      [p.customTarget === 'start' ? 'picker.start' : 'picker.end']: date
    });
    this.applyNow(false);
  },

  rebuildCal() {
    const p = this.data.picker;
    let weekStart = '';
    let weekEnd = '';
    let calDate = p.calDate || data.today();
    if (p.mode === 'week') {
      const date = p.weekDate || calDate;
      const wr = data.rangeFor('week', date);
      weekStart = wr.start;
      weekEnd = wr.end;
      calDate = date;
    }
    if (p.mode === 'custom') {
      const key = p.customTarget === 'start' ? 'startCal' : 'endCal';
      const cal = p[key];
      const date = cal.date || (key === 'startCal' ? p.start : p.end) || data.today();
      const cells = calendar.buildCalendar(cal.year, cal.month, 'month', date);
      this.setData({
        [`picker.${key}.cells`]: cells,
        [`picker.${key}.title`]: calendar.monthTitle(cal.year, cal.month)
      });
      return;
    }
    const cells = calendar.buildCalendar(p.calYear, p.calMonth, p.mode, calDate, weekStart, weekEnd);
    this.setData({
      'picker.calCells': cells,
      'picker.calTitle': calendar.monthTitle(p.calYear, p.calMonth)
    });
  },

  calShift(e) {
    const dir = Number(e.currentTarget.dataset.dir);
    const p = this.data.picker;
    if (p.mode === 'week') {
      const date = data.addDays(p.weekDate || p.calDate || data.today(), dir * 7);
      const parts = date.split('-').map(Number);
      this.setData({
        'picker.weekDate': date,
        'picker.calYear': parts[0],
        'picker.calMonth': parts[1]
      });
    } else if (p.mode === 'custom') {
      const key = p.customTarget === 'start' ? 'startCal' : 'endCal';
      const cal = p[key];
      let y = cal.year;
      let m = cal.month + dir;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      this.setData({
        [`picker.${key}.year`]: y,
        [`picker.${key}.month`]: m,
        [`picker.${key}.date`]: `${y}-${String(m).padStart(2, '0')}-01`
      });
    } else {
      let y = p.calYear;
      let m = p.calMonth + dir;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      this.setData({
        'picker.calYear': y,
        'picker.calMonth': m,
        'picker.calDate': `${y}-${String(m).padStart(2, '0')}-01`
      });
    }
    this.rebuildCal();
    if (p.mode !== 'custom') this.applyNow(false);
  },

  onPickDay(e) {
    const value = e.currentTarget.dataset.date;
    if (!value) return;
    const p = this.data.picker;
    if (p.mode === 'custom') {
      const key = p.customTarget === 'start' ? 'startCal' : 'endCal';
      const parts = value.split('-').map(Number);
      this.setData({
        [`picker.${key}.year`]: parts[0],
        [`picker.${key}.month`]: parts[1],
        [`picker.${key}.date`]: value
      });
      this.rebuildCal();
      return;
    }
    const parts = value.split('-').map(Number);
    const patch = {
      'picker.calYear': parts[0],
      'picker.calMonth': parts[1]
    };
    if (this.data.picker.mode === 'week') {
      patch['picker.weekDate'] = value;
    } else {
      patch['picker.calDate'] = value;
    }
    this.setData(patch);
    this.rebuildCal();
    this.applyNow(false);
  },

  onYearScroll(e) {
    const index = Math.round(Number(e.detail.scrollTop) / 44);
    const years = this.data.picker.years;
    if (!years.length) return;
    const clamped = Math.max(0, Math.min(years.length - 1, index));
    const year = years[clamped];
    if (year && year !== this.data.picker.year) {
      this.setData({ 'picker.year': year });
    }
  },

  onYearScrollEnd(e) {
    const index = Math.round(Number(e.detail.scrollTop) / 44);
    const years = this.data.picker.years;
    if (!years.length) return;
    const clamped = Math.max(0, Math.min(years.length - 1, index));
    const year = years[clamped];
    if (year) {
      this.setData({
        'picker.year': year,
        'picker.yearIndex': clamped,
        'picker.scrollInto': `year-${year}`
      });
    }
  },

  onYearTap(e) {
    const year = e.currentTarget.dataset.year;
    const index = this.data.picker.years.indexOf(year);
    if (index < 0) return;
    this.setData({
      'picker.year': year,
      'picker.yearIndex': index,
      'picker.scrollInto': `year-${year}`
    });
    this.applyNow(false);
  },

  onPickStart(e) {
    this.setData({ 'picker.start': e.detail.value });
    this.applyNow(false);
  },

  onPickEnd(e) {
    this.setData({ 'picker.end': e.detail.value });
    this.applyNow(false);
  },

  applyNow(close) {
    const p = this.data.picker;
    let mode = p.mode;
    let anchor = this.data.anchor;
    if (mode === 'month') {
      anchor = p.calDate || `${String(p.month).slice(0, 7)}-01`;
    } else if (mode === 'week') {
      anchor = p.weekDate || p.calDate;
    } else if (mode === 'year') {
      anchor = `${String(p.year).slice(0, 4)}-01-01`;
    } else {
      if (p.start > p.end) {
        wx.showToast({ title: '开始日期需早于结束日期', icon: 'none' });
        return;
      }
      anchor = `${p.start},${p.end}`;
    }
    this.setData({ mode, anchor, 'picker.show': close ? false : this.data.picker.show });
    this.refresh();
    if (close) this.setTabBarVisible(true);
  },

  applyPicker() {
    this.applyNow(true);
  },

  openEdit(e) {
    const id = e.currentTarget.dataset.id;
    const record = data.getRecords().find((r) => r.id === id);
    if (!record) return;
    const categories = data.categoriesFor(record.type);
    const index = Math.max(0, categories.findIndex((c) => c.name === record.category));
    this.setData({
      'edit.show': true,
      'edit.id': id,
      'edit.type': record.type,
      'edit.categories': categories,
      'edit.categoryIndex': index,
      'edit.category': categories[index].name,
      'edit.amount': data.money(record.amount),
      'edit.date': record.date,
      'edit.note': record.note || ''
    });
    this.setTabBarVisible(false);
  },

  closeEdit() {
    this.setData({ 'edit.show': false });
    this.setTabBarVisible(true);
  },

  onEditType(e) {
    const type = e.currentTarget.dataset.type;
    const categories = data.categoriesFor(type);
    this.setData({
      'edit.type': type,
      'edit.categories': categories,
      'edit.categoryIndex': 0,
      'edit.category': categories.length ? categories[0].name : ''
    });
  },

  onEditCategory(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({
      'edit.categoryIndex': index,
      'edit.category': this.data.edit.categories[index].name
    });
  },

  onEditAmount(e) {
    this.setData({ 'edit.amount': e.detail.value });
  },

  onEditDate(e) {
    this.setData({ 'edit.date': e.detail.value });
  },

  onEditNote(e) {
    this.setData({ 'edit.note': e.detail.value });
  },

  saveEdit() {
    const amount = Number(this.data.edit.amount);
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    data.updateRecord(this.data.edit.id, {
      type: this.data.edit.type,
      category: this.data.edit.category,
      amount,
      date: this.data.edit.date,
      note: this.data.edit.note.trim()
    });
    wx.showToast({ title: '已修改', icon: 'success' });
    this.setData({ 'edit.show': false });
    this.setTabBarVisible(true);
    this.refresh();
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这条记录？',
      success: (res) => {
        if (res.confirm) {
          data.deleteRecord(id);
          this.refresh();
        }
      }
    });
  },

  onRecordLongPress(e) {
    const id = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['修改', '删除'],
      success: (res) => {
        const evt = { currentTarget: { dataset: { id } } };
        if (res.tapIndex === 0) {
          this.openEdit(evt);
        } else if (res.tapIndex === 1) {
          this.onDelete(evt);
        }
      }
    });
  }
});
