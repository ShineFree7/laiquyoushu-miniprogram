const KEY = 'lqys_theme';

function getTheme() {
  try {
    return wx.getStorageSync(KEY) === 'theme2' ? 'theme2' : 'theme1';
  } catch (e) {
    return 'theme1';
  }
}

function setTheme(theme) {
  try {
    wx.setStorageSync(KEY, theme === 'theme2' ? 'theme2' : 'theme1');
  } catch (e) {
    // ignore storage errors
  }
}

function pageBackground(theme) {
  return theme === 'theme2' ? '#FFFFFF' : '#F5E9D6';
}

function applyTheme(that) {
  const theme = getTheme();
  const themeClass = theme === 'theme2' ? 'theme-2' : 'theme-1';
  that.setData({ theme, themeClass });
  try {
    wx.setBackgroundColor({ backgroundColor: pageBackground(theme) });
  } catch (e) {
    // ignore
  }
  try {
    wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: pageBackground(theme) });
  } catch (e) {
    // ignore
  }
  if (typeof that.getTabBar === 'function' && that.getTabBar()) {
    that.getTabBar().setData({ theme, themeClass });
  }
}

module.exports = {
  getTheme,
  setTheme,
  pageBackground,
  applyTheme
};
