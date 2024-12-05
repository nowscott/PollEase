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
  },

  globalData: {}
})
