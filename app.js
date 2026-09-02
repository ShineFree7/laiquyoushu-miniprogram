App({
  onLaunch() {
    const records = wx.getStorageSync('lqys_records');
    if (!Array.isArray(records)) {
      wx.setStorageSync('lqys_records', []);
    }
  }
});
