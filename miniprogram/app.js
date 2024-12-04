// app.js
App({
  globalData: {
    openid: null,
    userInfo: null,
    cloudEnv: 'polldata-6gg0tgkmfc2bb2a8',  // 使用你的实际云环境ID
    isLogin: false
  },

  async onLaunch() {
    // 检查并初始化云开发环境
    if (!wx.cloud) {
      wx.showModal({
        title: '错误',
        content: '当前微信版本不支持云开发，请升级微信',
        showCancel: false
      })
      return
    }

    // 初始化云开发
    wx.cloud.init({
      env: this.globalData.cloudEnv,
      traceUser: true
    })
  },

  // 用户登录方法
  async login() {
    try {
      // 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户信息'
      })

      // 获取 OpenID
      const cloudResult = await wx.cloud.callFunction({
        name: 'getOpenid',
        data: {}
      })

      if (cloudResult.result && cloudResult.result.openid) {
        this.globalData.openid = cloudResult.result.openid
        this.globalData.userInfo = userInfo
        this.globalData.isLogin = true

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        return {
          openid: this.globalData.openid,
          userInfo: this.globalData.userInfo
        }
      } else {
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        })
        return null
      }
    } catch (error) {
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
      return null
    }
  },

  // 获取用户信息的方法
  async getUserProfile() {
    if (this.globalData.userInfo) {
      return this.globalData.userInfo
    }

    try {
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户信息'
      })
      
      this.globalData.userInfo = userInfo
      return userInfo
    } catch (error) {
      wx.showModal({
        title: '提示',
        content: '请允许获取用户信息以使用完整功能',
        showCancel: false
      })
      return null
    }
  },

  // 检查投票是否已过期（超过1天）
  isPollExpired(createTime) {
    const now = new Date()
    const created = new Date(createTime)
    const oneDayInMs = 24 * 60 * 60 * 1000
    return (now - created) > oneDayInMs
  },

  // 检查用户是否已投票
  hasUserVoted(votes, openid) {
    // 如果没有 openid，始终返回 false
    if (!openid) return false
    
    return votes.some(vote => vote.voter === openid)
  },

  // 格式化时间
  formatTime(date) {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
