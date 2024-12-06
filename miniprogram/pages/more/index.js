Page({
  data: {
    statusBarHeight: '',
    titleBarHeight: ''
  },
  onLoad() {
    const app = getApp();
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      titleBarHeight: app.globalData.titleBarHeight
    });
  }
});
