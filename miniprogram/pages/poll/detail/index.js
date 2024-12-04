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
    // 先获取用户标识，再获取投票详情
    this.getUserInfo().then(openid => {
      if (openid) {
        this.fetchPollDetail()
      } else {
        this.setData({
          loading: false,
          error: '获取用户信息失败'
        })
      }
    })
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenid'
      })
      
      if (!result || !result.openid) {
        throw new Error('无法获取用户标识')
      }

      this.setData({ openid: result.openid })
      return result.openid
      
    } catch (err) {
      console.error('获取用户信息失败:', err)
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      })
      return null
    }
  },

  // 获取投票详情
  async fetchPollDetail() {
    try {
      if (!this.data.openid) {
        throw new Error('未能获取用户标识')
      }

      const db = wx.cloud.database()
      const { data } = await db.collection('polls').doc(this.data.pollId).get()
      
      if (!data) {
        throw new Error('投票不存在')
      }

      // 检查是否已过期
      const now = Date.now()
      const isExpired = now > data.endTime

      // 检查是否已投票
      const hasVoted = data.voters && data.voters.includes(this.data.openid)

      // 初始化投票数据
      const votes = {}
      // 先确保所有选项的票数初始化为 0
      data.options.forEach((_, index) => {
        votes[index] = 0
      })
      
      // 如果存在已有的投票数据，则覆盖初始值
      if (data.votes) {
        Object.keys(data.votes).forEach(key => {
          votes[key] = parseInt(data.votes[key]) || 0
        })
      }

      // 在设置 poll 数据之前，添加排序后的选项数组
      const sortedOptions = data.options.map((option, index) => ({
        text: option,
        index: index,
        votes: votes[index] || 0
      }));

      // 如果已投票，按票数排序
      if (hasVoted || isExpired) {
        sortedOptions.sort((a, b) => b.votes - a.votes);
      }

      this.setData({
        poll: {
          ...data,
          votes,
          sortedOptions,
          createTimeStr: this.formatDate(data.createTime),
          endTimeStr: this.formatDate(data.endTime)
        },
        isExpired,
        hasVoted,
        loading: false
      });
    } catch (err) {
      console.error('获取投票详情失败:', err)
      this.setData({
        loading: false,
        error: err.message || '获取投票详情失败'
      })
      
      wx.showModal({
        title: '错误',
        content: err.message || '获取投票详情失败',
        showCancel: false,
        complete: () => wx.navigateBack()
      })
    }
  },

  // 提交投票
  async submitVote(e) {
    const optionIndex = e.currentTarget.dataset.originalIndex;
    
    if (this.data.isExpired) {
      wx.showToast({
        title: '投票已结束',
        icon: 'none'
      })
      return
    }

    if (this.data.hasVoted) {
      wx.showToast({
        title: '您已经投过票了',
        icon: 'none'
      })
      return
    }

    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 确保使用数字类型进行递增
      const updateData = {
        [`votes.${optionIndex}`]: _.inc(1),
        voters: _.push([this.data.openid])
      }

      await db.collection('polls').doc(this.data.pollId).update({
        data: updateData
      })

      // 立即更新本地数据
      const newVotes = { ...this.data.poll.votes }
      newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1
      
      // 更新排序后的选项数组
      const newSortedOptions = this.data.poll.sortedOptions.map(option => ({
        ...option,
        votes: option.index === optionIndex ? option.votes + 1 : option.votes
      }));

      // 重新排序
      newSortedOptions.sort((a, b) => b.votes - a.votes);
      
      this.setData({
        'poll.votes': newVotes,
        'poll.sortedOptions': newSortedOptions,
        hasVoted: true
      });

      wx.showToast({
        title: '投票成功',
        icon: 'success'
      })

      // 设置上一页面的刷新标记
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2]; // 获取上一个页面
      if (prevPage && prevPage.route.includes('pages/poll/list/index')) {
        prevPage.setData({
          needRefresh: true
        });
      }

    } catch (err) {
      console.error('提交投票失败:', err)
      wx.showToast({
        title: '投票失败，请重试',
        icon: 'none'
      })
    }
  },

  // 计算选项的投票数
  calculateVoteCount(option) {
    const { poll } = this.data;
    if (!poll || !poll.votes) {
      return '0';
    }
    return String(poll.votes[option.index] || 0);
  },

  // 计算选项的投票百分比
  calculateVotePercentage(option) {
    const { poll } = this.data;
    if (!poll || !poll.votes) {
      return '0%';
    }
    
    const votes = poll.votes;
    const currentVotes = votes[option.index] || 0;
    
    // 计算总票数
    const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
    
    if (totalVotes === 0) {
      return '0%';
    }
    
    return Math.round((currentVotes / totalVotes) * 100) + '%';
  },

  // 日期格式化方法
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

  // 分享功能
  onShareAppMessage() {
    const { poll, pollId } = this.data
    return {
      title: poll ? poll.title : '邀请你参与投票',
      path: `/pages/poll/detail/index?pollId=${pollId}`,
      imageUrl: '/images/share-default.png'  // 可选：设置自定义分享图片
    }
  }
})