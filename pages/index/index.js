const data = require('../../utils/data.js');
const calendar = require('../../utils/calendar.js');
const theme = require('../../utils/theme.js');

const DEFAULT_CUSTOM_ICON = '/images/categories/other.png';

Page({
  data: {
    theme: 'theme1',
    themeClass: 'theme-1',
    today: data.today(),
    todayExpense: '0.00',
    todayIncome: '0.00',
    type: 'expense',
    categories: [],
    selectedCategory: '',
    selectedIcon: DEFAULT_CUSTOM_ICON,
    selectedIconType: 'image',
    showCats: false,
    calWeek: ['日', '一', '二', '三', '四', '五', '六'],
    datePicker: {
      show: false,
      calYear: 0,
      calMonth: 0,
      calCells: [],
      calTitle: '',
      calDate: ''
    },
    form: {
      type: 'expense',
      amount: '',
      date: data.today(),
      note: ''
    },
    custom: {
      show: false,
      name: '',
      icon: DEFAULT_CUSTOM_ICON,
      iconType: 'image',
      textIcon: '',
      imagePath: ''
    }
  },

  onShow() {
    theme.applyTheme(this);
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, show: true });
    }
    this.refreshToday();
    this.loadCategories();
  },

  onHide() {
    this.setData({ 'custom.show': false, showCats: false, 'datePicker.show': false });
    this.setTabBarVisible(true);
  },

  setTabBarVisible(visible) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ show: visible });
    }
  },

  refreshToday() {
    const t = data.today();
    const s = data.summaryInRange(t, t);
    this.setData({
      today: t,
      todayExpense: data.money(s.expense),
      todayIncome: data.money(s.income)
    });
  },

  loadCategories() {
    const categories = data.categoriesFor(this.data.type);
    let selected = this.data.selectedCategory;
    if (!categories.some((c) => c.name === selected)) {
      selected = categories.length ? categories[0].name : '';
    }
    this.updateSelectedDisplay(categories, selected);
  },

  updateSelectedDisplay(categories, selected) {
    const cat = categories.find((c) => c.name === selected) || null;
    this.setData({
      categories,
      selectedCategory: selected,
      selectedIcon: cat ? cat.icon : '',
      selectedIconType: cat ? (cat.iconType || 'emoji') : 'emoji'
    });
  },

  setType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ type, 'form.type': type, selectedCategory: '', showCats: false });
    this.loadCategories();
  },

  toggleCats() {
    this.setData({ showCats: !this.data.showCats });
  },

  selectCategory(e) {
    this.updateSelectedDisplay(this.data.categories, e.currentTarget.dataset.name);
    this.setData({ showCats: false });
  },

  onAmount(e) {
    this.setData({ 'form.amount': e.detail.value });
  },

  showDatePicker() {
    const dateStr = this.data.form.date || data.today();
    const parts = String(dateStr).slice(0, 10).split('-').map(Number);
    const calDate = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
    this.setData({
      'datePicker.show': true,
      'datePicker.calYear': parts[0],
      'datePicker.calMonth': parts[1],
      'datePicker.calDate': calDate,
      'datePicker.calCells': calendar.buildCalendar(parts[0], parts[1], 'month', calDate),
      'datePicker.calTitle': calendar.monthTitle(parts[0], parts[1])
    });
    this.setTabBarVisible(false);
  },

  closeDatePicker() {
    this.setData({ 'datePicker.show': false });
    this.setTabBarVisible(true);
  },

  dateShift(e) {
    const dir = Number(e.currentTarget.dataset.dir);
    let y = this.data.datePicker.calYear;
    let m = this.data.datePicker.calMonth + dir;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    const calDate = this.data.datePicker.calDate;
    this.setData({
      'datePicker.calYear': y,
      'datePicker.calMonth': m,
      'datePicker.calCells': calendar.buildCalendar(y, m, 'month', calDate),
      'datePicker.calTitle': calendar.monthTitle(y, m)
    });
  },

  pickDate(e) {
    const value = e.currentTarget.dataset.date;
    if (!value) return;
    const y = this.data.datePicker.calYear;
    const m = this.data.datePicker.calMonth;
    this.setData({
      'datePicker.calDate': value,
      'datePicker.calCells': calendar.buildCalendar(y, m, 'month', value)
    });
  },

  applyDatePicker() {
    this.setData({ 'form.date': this.data.datePicker.calDate, 'datePicker.show': false });
    this.setTabBarVisible(true);
  },

  onNote(e) {
    this.setData({ 'form.note': e.detail.value });
  },

  onSave() {
    const amount = Number(this.data.form.amount);
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    if (!this.data.selectedCategory) {
      wx.showToast({ title: '请选择分类', icon: 'none' });
      return;
    }
    data.saveRecord({
      type: this.data.type,
      amount,
      category: this.data.selectedCategory,
      date: this.data.form.date,
      note: this.data.form.note.trim()
    });
    wx.showToast({ title: '已记录', icon: 'success' });
    this.setData({ 'form.amount': '', 'form.note': '' });
    this.refreshToday();
  },

  showCustom() {
    this.setData({
      'custom.show': true,
      'custom.name': '',
      'custom.icon': DEFAULT_CUSTOM_ICON,
      'custom.iconType': 'image',
      'custom.textIcon': '',
      'custom.imagePath': ''
    });
    this.setTabBarVisible(false);
  },

  closeCustom() {
    this.setData({ 'custom.show': false });
    this.setTabBarVisible(true);
  },

  noop() {},

  onCustomName(e) {
    this.setData({ 'custom.name': e.detail.value });
  },

  onCustomText(e) {
    const value = e.detail.value;
    this.setData({
      'custom.textIcon': value,
      'custom.icon': value || DEFAULT_CUSTOM_ICON,
      'custom.iconType': 'emoji'
    });
  },

  saveCustom() {
    const name = this.data.custom.name.trim();
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }
    const exists = data.categoriesFor(this.data.type).some((c) => c.name === name);
    if (exists) {
      wx.showToast({ title: '分类已存在', icon: 'none' });
      return;
    }
    data.addCustomCategory({
      name,
      icon: this.data.custom.icon,
      iconType: this.data.custom.iconType,
      type: this.data.type
    });
    wx.showToast({ title: '已添加', icon: 'success' });
    this.setData({ 'custom.show': false });
    this.setTabBarVisible(true);
    this.loadCategories();
    this.updateSelectedDisplay(this.data.categories, name);
    this.setData({ showCats: true });
  },

  onCategoryLongPress(e) {
    this.confirmDeleteCategory(e.currentTarget.dataset);
  },

  onCategoryDelete(e) {
    this.confirmDeleteCategory(e.currentTarget.dataset);
  },

  confirmDeleteCategory(ds) {
    const name = ds.name;
    if (!name) return;
    const isCustom = ds.custom;
    const id = ds.id;
    if (isCustom && !id) return;
    wx.showModal({
      title: '删除分类？',
      content: isCustom
        ? `删除自定义分类“${name}”？已有记录仍会保留。`
        : `删除分类“${name}”？之后分类列表不再显示，已有记录仍会保留。`,
      success: (res) => {
        if (!res.confirm) return;
        if (isCustom) {
          data.removeCustomCategory(id);
        } else {
          data.removeDefaultCategory(name);
        }
        this.loadCategories();
      }
    });
  }
});
