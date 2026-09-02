const data = require('../../utils/data.js');
const theme = require('../../utils/theme.js');

const THEME_LABELS = ['主题1 · 米色棕', '主题2 · 皇家蓝', '更多主题（待上架）'];
const CONTACT_EMAIL = 'su_55@foxmail.com';

Page({
  data: {
    theme: 'theme1',
    themeClass: 'theme-1',
    themeLabel: '主题1 · 米色棕',
    contactEmail: CONTACT_EMAIL,
    feedback: {
      show: false,
      text: '',
      contact: ''
    }
  },

  onShow() {
    theme.applyTheme(this);
    const current = theme.getTheme();
    this.setData({ themeLabel: current === 'theme2' ? '主题2 · 皇家蓝' : '主题1 · 米色棕' });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  setTabBarVisible(visible) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ show: visible });
    }
  },

  onExportJson() {
    const backup = data.exportBackup();
    if (!backup.records.length) {
      wx.showToast({ title: '暂无数据', icon: 'none' });
      return;
    }
    this.writeAndShareFile('laiquyoushu-backup.json', JSON.stringify(backup, null, 2));
  },

  onExportCsv() {
    const records = data.getRecords();
    if (!records.length) {
      wx.showToast({ title: '暂无数据', icon: 'none' });
      return;
    }
    this.writeAndShareFile('laiquyoushu-records.csv', data.exportCsv(records));
  },

  onExport() {
    wx.showActionSheet({
      itemList: ['导出 JSON 备份', '导出 CSV 表格'],
      success: (res) => {
        if (res.tapIndex === 0) this.onExportJson();
        else if (res.tapIndex === 1) this.onExportCsv();
      }
    });
  },

  writeAndShareFile(fileName, text) {
    const fs = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    fs.writeFile({
      filePath,
      data: text,
      encoding: 'utf8',
      success: () => {
        wx.shareFileMessage({
          filePath,
          fileName,
          success: () => {
            wx.showToast({ title: '已导出', icon: 'success' });
          },
          fail: () => {
            wx.setClipboardData({ data: text });
            wx.showToast({ title: '已复制内容', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.setClipboardData({ data: text });
        wx.showToast({ title: '已复制内容', icon: 'none' });
      }
    });
  },

  onImport() {
    wx.showActionSheet({
      itemList: ['从聊天中选择文件', '从剪贴板粘贴导入'],
      success: (res) => {
        if (res.tapIndex === 0) this.chooseImportFile();
        else this.pasteImport();
      }
    });
  },

  chooseImportFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) {
          wx.showToast({ title: '未选择文件', icon: 'none' });
          return;
        }
        wx.getFileSystemManager().readFile({
          filePath: file.path,
          encoding: 'utf8',
          success: (r) => {
            this.prepareImport(String(r.data || ''));
          },
          fail: () => {
            wx.showToast({ title: '读取文件失败', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '已取消选择', icon: 'none' });
      }
    });
  },

  pasteImport() {
    wx.getClipboardData({
      success: (res) => {
        this.prepareImport(String(res.data || ''));
      },
      fail: () => {
        wx.showToast({ title: '读取剪贴板失败', icon: 'none' });
      }
    });
  },

  prepareImport(text) {
    const rawText = String(text || '');
    if (rawText.includes('\uFFFD')) {
      wx.showToast({ title: '文件编码需为 UTF-8', icon: 'none' });
      return;
    }
    let parsed;
    try {
      const trimmed = rawText.trim();
      if (!trimmed) throw new Error('empty');
      if (trimmed[0] === '[' || trimmed[0] === '{') {
        const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const isJsonl = lines.length > 1 && lines.every((l) => l.startsWith('{') && l.endsWith('}'));
        parsed = isJsonl
          ? { records: lines.map((l) => JSON.parse(l)), customCategories: [], removedCategories: [] }
          : data.parseBackupJson(trimmed);
      } else {
        parsed = { records: data.parseCsv(trimmed), customCategories: [], removedCategories: [] };
      }
    } catch (e) {
      wx.showToast({ title: '无法识别文件格式', icon: 'none' });
      return;
    }
    if (!parsed.records || !parsed.records.length) {
      wx.showToast({ title: '没有可导入的记录，请确认包含日期和金额', icon: 'none' });
      return;
    }
    wx.showActionSheet({
      itemList: ['合并导入', '覆盖导入'],
      success: (res) => {
        const mode = res.tapIndex === 1 ? 'overwrite' : 'merge';
        const result = data.importBackup(parsed, mode);
        wx.showToast({ title: `已导入 ${result.records} 条`, icon: 'success' });
      }
    });
  },

  onClear() {
    wx.showModal({
      title: '清空全部数据？',
      content: '此操作不可恢复，确定要继续吗？',
      confirmText: '继续',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;
        wx.showModal({
          title: '再次确认',
          content: '清空后无法恢复，确认清空全部数据？',
          confirmText: '确认清空',
          cancelText: '取消',
          success: (r2) => {
            if (!r2.confirm) return;
            data.clearRecords();
            wx.showToast({ title: '已清空', icon: 'success' });
          }
        });
      }
    });
  },

  openFeedback() {
    this.setData({ 'feedback.show': true, 'feedback.text': '', 'feedback.contact': '' });
    this.setTabBarVisible(false);
  },

  closeFeedback() {
    this.setData({ 'feedback.show': false });
    this.setTabBarVisible(true);
  },

  noop() {},

  onFeedbackText(e) {
    this.setData({ 'feedback.text': e.detail.value });
  },

  onFeedbackContact(e) {
    this.setData({ 'feedback.contact': e.detail.value });
  },

  copyEmail() {
    const email = this.data.contactEmail;
    if (!email) {
      wx.showToast({ title: '联系邮箱待配置', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: email,
      success: () => {
        wx.showToast({ title: '邮箱已复制', icon: 'none' });
      }
    });
  },

  copyFeedback() {
    const text = this.data.feedback.text.trim();
    if (!text) {
      wx.showToast({ title: '请先填写反馈内容', icon: 'none' });
      return;
    }
    const contact = this.data.feedback.contact.trim();
    const lines = ['来去有数 意见反馈', '', text];
    if (contact) lines.push('', `联系方式：${contact}`);
    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => {
        wx.showToast({ title: '反馈已复制', icon: 'none' });
      }
    });
  },

  onThemeTap() {
    wx.showActionSheet({
      itemList: THEME_LABELS,
      success: (res) => {
        if (res.tapIndex === 2) {
          wx.showToast({ title: '更多主题敬请期待', icon: 'none' });
          return;
        }
        const next = res.tapIndex === 1 ? 'theme2' : 'theme1';
        theme.setTheme(next);
        theme.applyTheme(this);
        this.setData({ themeLabel: THEME_LABELS[res.tapIndex] });
        wx.showToast({
          title: next === 'theme2' ? '已切换皇家蓝' : '已切换米色棕',
          icon: 'none'
        });
      }
    });
  }
});
