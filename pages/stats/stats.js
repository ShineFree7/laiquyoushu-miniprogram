const data = require('../../utils/data.js');
const charts = require('../../utils/charts.js');
const calendar = require('../../utils/calendar.js');
const theme = require('../../utils/theme.js');

const PIE_EXPENSE_RAMP = { light: '#E9EDF2', dark: '#263238' };
const PIE_INCOME_RAMP = { light: '#E8EFEA', dark: '#3A5050' };
const PIE_BALANCE_RAMP = { light: '#E7E7E5', dark: '#424242' };
const DASH_EXPENSE_RAMP = { light: '#F2F6FF', dark: '#2F55C8' };
const DASH_INCOME_RAMP = { light: '#EDF8F0', dark: '#2E7D32' };
const DASH_BALANCE_RAMP = { light: '#E8F6F4', dark: '#00695C' };

function mixColor(from, to, t) {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t));
  const g = Math.round(((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t));
  const bl = Math.round((a & 255) + (((b & 255) - (a & 255)) * t));
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

function pieGradientColor(ramp, amount, minAmount, maxAmount) {
  const t = maxAmount > minAmount ? (amount - minAmount) / (maxAmount - minAmount) : 0.5;
  return mixColor(ramp.light, ramp.dark, t);
}

Page({
  data: {
    theme: 'theme1',
    themeClass: 'theme-1',
    mode: 'month',
    anchor: data.today(),
    range: { start: '', end: '' },
    title: '',
    metric: 'expense',
    pieTitle: '支出分类占比',
    barTitle: '每日支出',
    lineTitle: '支出累计',
    summary: { expenseText: '0.00', incomeText: '0.00', balanceText: '0.00' },
    calWeek: ['日', '一', '二', '三', '四', '五', '六'],
    pie: { items: [], img: '', centerTitle: '总支出', centerAmount: '¥0.00' },
    bar: {
      labels: [],
      values: [],
      expense: [],
      income: [],
      img: '',
      hasData: false,
      selectedIndex: -1,
      selectedText: '',
      daily: { expense: '', income: '', balance: '' }
    },
    line: { labels: [], values: [], img: '', color: '#212121', tagText: '支出', hasData: false },
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
      this.getTabBar().setData({ selected: 2, show: true });
    }
    this.refresh();
  },

  onReady() {
    this.drawCharts();
  },

  onHide() {
    this.setData({ 'picker.show': false });
    this.setTabBarVisible(true);
  },

  setTabBarVisible(visible) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ show: visible });
    }
  },

  onMetric(e) {
    this.setData({ metric: e.currentTarget.dataset.metric });
    this.refresh();
  },

  refresh() {
    const range = data.rangeFor(this.data.mode, this.data.anchor);
    const summary = data.summaryInRange(range.start, range.end);
    const series = data.seriesInRange(range.start, range.end);
    const dayCount = data.daysInRange(range.start, range.end);
    const byDay = dayCount <= 31;
    const metric = this.data.metric;
    const t2 = this.data.theme === 'theme2';
    const expenseRamp = t2 ? DASH_EXPENSE_RAMP : PIE_EXPENSE_RAMP;
    const incomeRamp = t2 ? DASH_INCOME_RAMP : PIE_INCOME_RAMP;
    const balanceRamp = t2 ? DASH_BALANCE_RAMP : PIE_BALANCE_RAMP;

    let pieItems = [];
    let pieTitle = '支出分类占比';
    let pieCenterTitle = '总支出';
    let pieCenterAmount = `¥${data.money(summary.expense)}`;
    if (metric === 'income') {
      pieTitle = '收入分类占比';
      pieCenterTitle = '总收入';
      pieCenterAmount = `¥${data.money(summary.income)}`;
      const cats = data.categorySummaryInRange(range.start, range.end, 'income');
      const total = cats.reduce((s, c) => s + c.amount, 0);
      const amounts = cats.map((c) => c.amount);
      const minAmount = Math.min.apply(null, amounts.concat([0]));
      const maxAmount = Math.max.apply(null, amounts.concat([0]));
      pieItems = cats.map((c) => Object.assign({}, c, {
        color: pieGradientColor(incomeRamp, c.amount, minAmount, maxAmount),
        percent: total > 0 ? Math.round((c.amount / total) * 100) : 0,
        amountText: data.money(c.amount)
      }));
    } else if (metric === 'balance') {
      pieTitle = '支出收入构成';
      pieCenterTitle = '结余';
      pieCenterAmount = `¥${data.money(summary.balance)}`;
      const rows = [];
      if (summary.expense > 0) rows.push({ name: '支出', icon: '/images/categories/expense.png', iconType: 'image', amount: summary.expense });
      if (summary.income > 0) rows.push({ name: '收入', icon: '/images/categories/income.png', iconType: 'image', amount: summary.income });
      const total = rows.reduce((s, c) => s + c.amount, 0);
      const amounts = rows.map((c) => c.amount);
      const minAmount = Math.min.apply(null, amounts.concat([0]));
      const maxAmount = Math.max.apply(null, amounts.concat([0]));
      pieItems = rows.map((c) => Object.assign({}, c, {
        color: pieGradientColor(balanceRamp, c.amount, minAmount, maxAmount),
        percent: total > 0 ? Math.round((c.amount / total) * 100) : 0,
        amountText: data.money(c.amount)
      }));
    } else {
      const cats = data.categorySummaryInRange(range.start, range.end, 'expense');
      const total = cats.reduce((s, c) => s + c.amount, 0);
      const amounts = cats.map((c) => c.amount);
      const minAmount = Math.min.apply(null, amounts.concat([0]));
      const maxAmount = Math.max.apply(null, amounts.concat([0]));
      pieItems = cats.map((c) => Object.assign({}, c, {
        color: pieGradientColor(expenseRamp, c.amount, minAmount, maxAmount),
        percent: total > 0 ? Math.round((c.amount / total) * 100) : 0,
        amountText: data.money(c.amount)
      }));
    }

    let values;
    let barTitle;
    let lineTitle;
    let lineColor;
    let tagText;
    if (metric === 'income') {
      values = series.income;
      barTitle = '每日收入';
      lineTitle = `收入累计（${byDay ? '按天' : '按月'}）`;
      lineColor = t2 ? '#4169E1' : '#212121';
      tagText = '收入';
    } else if (metric === 'balance') {
      values = series.income.map((v, i) => Math.round((v - series.expense[i]) * 100) / 100);
      barTitle = '每日结余';
      lineTitle = `结余累计（${byDay ? '按天' : '按月'}）`;
      lineColor = t2 ? '#4169E1' : '#212121';
      tagText = '结余';
    } else {
      values = series.expense;
      barTitle = '每日支出';
      lineTitle = `支出累计（${byDay ? '按天' : '按月'}）`;
      lineColor = t2 ? '#4169E1' : '#212121';
      tagText = '支出';
    }

    let cum = 0;
    const lineValues = values.map((v) => {
      cum = Math.round((cum + v) * 100) / 100;
      return cum;
    });

    this.setData({
      range,
      title: data.rangeLabel(range, this.data.mode),
      pieTitle,
      barTitle,
      lineTitle,
      summary: {
        expenseText: data.money(summary.expense),
        incomeText: data.money(summary.income),
        balanceText: data.money(summary.balance)
      },
      pie: {
        items: pieItems,
        img: this.data.pie.img,
        centerTitle: pieCenterTitle,
        centerAmount: pieCenterAmount
      },
      bar: {
        labels: series.labels,
        values,
        expense: series.expense,
        income: series.income,
        img: '',
        hasData: values.some((v) => v !== 0),
        selectedIndex: -1,
        selectedText: '',
        daily: {
          expense: data.money(summary.expense / dayCount),
          income: data.money(summary.income / dayCount),
          balance: data.money(summary.balance / dayCount)
        }
      },
      line: {
        labels: series.labels,
        values: lineValues,
        img: this.data.line.img,
        color: lineColor,
        tagText,
        hasData: lineValues.some((v) => v !== 0)
      }
    });
    this.drawCharts();
  },

  drawCharts() {
    wx.nextTick(() => {
      const pie = this.data.pie.items;
      charts.toCanvasImage(this, 'pieCanvas', (ctx, w, h) => {
        charts.drawPie(ctx, w, h, pie, {
          centerTitle: this.data.pie.centerTitle,
          centerAmount: this.data.pie.centerAmount,
          theme: this.data.theme
        });
      }).then((src) => {
        if (src) this.setData({ 'pie.img': src });
      });
      this.drawBarChart();
      const line = this.data.line;
      charts.toCanvasImage(this, 'lineCanvas', (ctx, w, h) => {
        charts.drawLines(ctx, w, h, line.labels, line.values, line.color, this.data.theme);
      }).then((src) => {
        if (src) this.setData({ 'line.img': src });
      });
    });
  },

  drawBarChart() {
    const bar = this.data.bar;
    const barColor = this.data.theme === 'theme2' ? '#4169E1' : '#212121';
    const dailyAvg = this.data.metric === 'income'
      ? Number(bar.daily.income)
      : this.data.metric === 'balance'
        ? Number(bar.daily.balance)
        : Number(bar.daily.expense);
    charts.toCanvasImage(this, 'barCanvas', (ctx, w, h) => {
      charts.drawBars(ctx, w, h, bar.labels, bar.values, barColor, barColor, this.data.theme, {
        selected: bar.selectedIndex,
        selectedColor: this.data.theme === 'theme2' ? '#1F3FA8' : '#000000',
        avg: bar.hasData ? dailyAvg : null
      });
    }).then((src) => {
      if (src) this.setData({ 'bar.img': src });
    });
  },

  onBarTouch(e) {
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!t || t.clientX === undefined) return;
    const clientX = t.clientX;
    wx.createSelectorQuery().in(this).select('.bar-touch-layer').boundingClientRect((rect) => {
      if (!rect || !rect.width) return;
      const x = clientX - rect.left;
      const n = this.data.bar.labels.length;
      const idx = charts.barIndexAt(rect.width, n, x);
      if (idx < 0 || idx === this.data.bar.selectedIndex) {
        this.clearBarSelection();
      } else {
        this.selectBar(idx);
      }
    }).exec();
  },

  selectBar(idx) {
    const bar = this.data.bar;
    if (!bar.labels[idx]) return;
    const byDay = bar.labels[idx].indexOf('/') >= 0;
    const when = byDay ? data.dateLabel(data.addDays(this.data.range.start, idx)) : bar.labels[idx];
    const expText = data.money(bar.expense[idx] || 0);
    const incText = data.money(bar.income[idx] || 0);
    let text = `${when} · 支出 ¥${expText} · 收入 ¥${incText}`;
    if (this.data.metric === 'balance') {
      const balText = data.money((bar.income[idx] || 0) - (bar.expense[idx] || 0));
      text += ` · 结余 ¥${balText}`;
    }
    this.setData({ 'bar.selectedIndex': idx, 'bar.selectedText': text });
    this.drawBarChart();
  },

  clearBarSelection() {
    if (this.data.bar.selectedIndex < 0) return;
    this.setData({ 'bar.selectedIndex': -1, 'bar.selectedText': '' });
    this.drawBarChart();
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
    this.refresh();
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
  }
});
