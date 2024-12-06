const app = getApp();
Page({
  data: {
    statusBarHeight: '',
    titleBarHeight: ''
  },
  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      titleBarHeight: app.globalData.titleBarHeight
    });
  }
});
