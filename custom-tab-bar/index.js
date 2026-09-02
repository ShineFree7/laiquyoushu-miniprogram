Component({
  data: {
    selected: 0,
    theme: 'theme1',
    themeClass: 'theme-1',
    show: true,
    list: [
      { pagePath: '/pages/index/index', text: '记一笔' },
      { pagePath: '/pages/detail/detail', text: '明细' },
      { pagePath: '/pages/stats/stats', text: '统计' },
      { pagePath: '/pages/mine/mine', text: '我的' }
    ]
  },

  pageLifetimes: {
    show() {
      const pages = getCurrentPages();
      const route = pages.length ? pages[pages.length - 1].route : '';
      const index = this.data.list.findIndex((item) => item.pagePath === `/${route}`);
      if (index >= 0) this.setData({ selected: index, show: true });
    }
  },

  methods: {
    switchTab(e) {
      const item = this.data.list[Number(e.currentTarget.dataset.index)];
      wx.switchTab({ url: item.pagePath });
    }
  }
});
