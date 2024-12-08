// app.js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'polldata-6gg0tgkmfc2bb2a8',
        traceUser: true,
      })
    }

    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const tabBarHeight = systemInfo.screenHeight - systemInfo.windowHeight - statusBarHeight;
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const titleBarHeight = menuButton.bottom - menuButton.top + 2 * (menuButton.top - statusBarHeight);
    const pageHeight = systemInfo.screenHeight + titleBarHeight;
    const pageTopy = statusBarHeight + titleBarHeight;
    // 将高度信息存储在全局数据中
    this.globalData = {
      statusBarHeight: statusBarHeight + 'px',
      titleBarHeight: titleBarHeight + 'px',
      tabBarHeight: tabBarHeight + 'px',
      pageHeight: pageHeight + 'px',
      pageTopy: pageTopy + 'px'
    };

  },
  globalData: {}
})
