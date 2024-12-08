// app.js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: wx.cloud.DYNAMIC_CURRENT_ENV, 
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
    this.globalData = {
      version: '0.3.1',
      statusBarHeight: statusBarHeight + 'px',
      titleBarHeight: titleBarHeight + 'px',
      tabBarHeight: tabBarHeight + 'px',
      pageHeight: pageHeight + 'px',
      pageTopy: pageTopy + 'px'
    };

  },
  globalData: {}
})
