// pages/poll/detail/index.js
const app = getApp()

Page({
  data: {
    pollId: null,
    poll: null,
    loading: true,
    error: null,
    hasVoted: false,
    isExpired: false,
    openid: ''
  },

  onLoad(options) {
    const { pollId } = options
    if (!pollId) {
      wx.showModal({
        title: '错误',
        content: '无效的投票ID',
        showCancel: false,
        complete: () => wx.navigateBack()
      })
      return
    }

    this.setData({ pollId })
    
    // 确保云开发环境初始化
    if (!wx.cloud) {
      wx.cloud.init({
        traceUser: true,
        env: 'polldata-6gg0tgkmfc2bb2a8'
      })
    }

    // 初始化页面数据
    this.initPageData()
  },

  // 添加 onShow 生命周期
  onShow() {
    // 如果已经有 pollId，重新加载数据
    if (this.data.pollId) {
      this.initPageData()
    }
  },

  // 新增初始化方法
  async initPageData() {
    try {
      // 先尝试获取 openid
      const openid = await this.getUserInfo()
      
      // 无论是否获取到 openid，都继续加载投票详情
      await this.fetchPollDetail()
    } catch (err) {
      console.error('初始化页面失败:', err)
      this.fetchPollDetail() // 即使出错也尝试加载投票详情
    }
  },

  // 简化获取用户信息的方法
  async getUserInfo() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenid'
      })
      
      if (result && result.openid) {
        this.setData({ openid: result.openid })
        return result.openid
      }
      return null
    } catch (err) {
      console.error('获取用户信息失败:', err)
      return null
    }
  },

  // 修改提交投票的方法
  async submitVote(e) {
    // 确保正确获取 optionIndex
    const optionIndex = e.currentTarget.dataset.originalIndex
    
    console.log('提交投票，选项索引:', optionIndex) // 添加日志便于调试
    
    if (optionIndex === undefined || optionIndex === null) {
      wx.showToast({
        title: '无效的选项',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '提交中...'
    })
    
    try {
      // 如果没有 openid，尝试重新获取
      if (!this.data.openid) {
        const openid = await this.getUserInfo()
        if (!openid) {
          wx.hideLoading()
          wx.showToast({
            title: '无法获取用户信息，请稍后重试',
            icon: 'none'
          })
          return
        }
      }

      console.log('调用投票云函数，参数:', {
        pollId: this.data.pollId,
        optionIndex: optionIndex
      }) // 添加日志

      const { result } = await wx.cloud.callFunction({
        name: 'submitVote',
        data: {
          pollId: this.data.pollId,
          optionIndex: parseInt(optionIndex) // 确保 optionIndex 是数字
        }
      })

      wx.hideLoading()
      
      if (result.error) {
        wx.showToast({
          title: result.error,
          icon: 'none'
        })
        return
      }

      wx.showToast({
        title: '投票成功',
        icon: 'success'
      })
      
      // 重新加载投票详情以更新显示
      await this.fetchPollDetail()
      
    } catch (err) {
      console.error('提交投票失败:', err, '选项索引:', optionIndex)
      wx.hideLoading()
      wx.showToast({
        title: '投票失败，请重试',
        icon: 'none'
      })
    }
  },

  // 修改 fetchPollDetail 方法
  async fetchPollDetail() {
    wx.showLoading({
      title: '加载中...'
    })

    try {
      // 先尝试获取 openid（如果还没有的话）
      if (!this.data.openid) {
        await this.getUserInfo()
      }

      const db = wx.cloud.database()
      const { data } = await db.collection('polls').doc(this.data.pollId).get()
      
      if (!data) {
        throw new Error('投票不存在')
      }

      // 检查是否已过期
      const now = Date.now()
      const isExpired = now > data.endTime

      // 增加日志输出便于调试
      console.log('投票详情:', {
        openid: this.data.openid,
        voters: data.voters,
        voterType: data.voters ? data.voters.map(v => typeof v) : [],
        voterValues: data.voters || []
      })

      let hasVoted = false
      if (this.data.openid && data.voters && Array.isArray(data.voters)) {
        hasVoted = data.voters.some(voter => {
          if (typeof voter === 'string') {
            return voter === this.data.openid
          }
          return voter && voter.openid === this.data.openid
        })
      }

      // 初始化投票数据
      const votes = {}
      data.options.forEach((_, index) => {
        votes[index] = 0
      })
      
      if (data.votes) {
        Object.keys(data.votes).forEach(key => {
          votes[key] = parseInt(data.votes[key]) || 0
        })
      }

      // 处理选项排序 - 直接按票数排序，不需要条件判断
      const sortedOptions = data.options.map((option, index) => ({
        text: option,
        index: index,
        votes: votes[index] || 0
      })).sort((a, b) => {
        if (b.votes === a.votes) {
          // 票数相同时，保持原有顺序
          return a.index - b.index
        }
        return b.votes - a.votes
      })

      this.setData({
        poll: {
          ...data,
          votes,
          sortedOptions,
          createTimeStr: this.formatDate(data.createTime),
          endTimeStr: this.formatDate(data.endTime),
          voterCount: data.voters ? data.voters.length : 0
        },
        isExpired,
        hasVoted,
        loading: false
      })

      // 添加设置后的状态日志
      console.log('页面状态:', {
        hasVoted,
        isExpired,
        openid: this.data.openid
      })

      wx.hideLoading()
    } catch (err) {
      console.error('获取投票详情失败:', err)
      wx.hideLoading()
      
      this.setData({
        loading: false,
        error: err.message || '获取投票详情失败'
      })
      
      wx.showToast({
        title: err.message || '加载失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 添加日期格式化方法
  formatDate(timestamp) {
    if (!timestamp) {
      return '未知时间'
    }
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 添加计算投票百分比的方法
  calculateVotePercentage(option) {
    const { poll } = this.data
    if (!poll || !poll.votes) {
      return '0%'
    }
    
    const votes = poll.votes
    const currentVotes = votes[option.index] || 0
    
    // 计算总票数
    const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0)
    
    if (totalVotes === 0) {
      return '0%'
    }
    
    return Math.round((currentVotes / totalVotes) * 100) + '%'
  },

  // 添加分享方法
  onShareAppMessage() {
    const { poll, pollId } = this.data
    return {
      title: poll ? poll.title : '邀请你参与投票',
      path: `/pages/poll/detail/index?pollId=${pollId}`,
      imageUrl: '/images/share-default.png'
    }
  }
})