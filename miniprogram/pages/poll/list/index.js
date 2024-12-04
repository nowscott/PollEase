// 投票列表页面
const app = getApp()

Page({
  data: {
    pollList: [],
    loading: true,
    error: null,
    openid: '',
    deleteWidth: 160,
    touchStartX: 0,
    activeIndex: null,
    needRefresh: false
  },

  onLoad() {
    this.getUserInfo().then(() => {
      this.fetchPollList()
    })
  },

  onShow() {
    if (this.data.needRefresh) {
      this.fetchPollList();
      this.setData({ needRefresh: false });
    }
  },

  onPullDownRefresh() {
    this.fetchPollList()
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
      this.handleError('获取用户信息失败', err)
      return null
    }
  },

  // 获取投票列表
  async fetchPollList() {
    if (!this.data.openid) return

    this.setData({ 
      loading: true,
      error: null
    })

    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('polls')
        .where({
          _openid: this.data.openid
        })
        .orderBy('createTime', 'desc')
        .get()

      const pollList = data.map(poll => ({
        ...poll,
        totalVotes: poll.votes ? 
          (Array.isArray(poll.votes) ? 
            poll.votes.reduce((a, b) => a + b, 0) : 
            Object.values(poll.votes).reduce((a, b) => a + b, 0)) : 0,
        endTimeStr: this.formatDate(poll.endTime),
        xMove: 0
      }))

      this.setData({
        pollList,
        loading: false
      })
    } catch (err) {
      this.setData({
        loading: false,
        error: '获取列表失败'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 合并触摸处理逻辑
  handleTouchMove(e) {
    if (this.data.activeIndex === null) return
    
    const moveX = e.touches[0].clientX
    const deltaX = moveX - this.data.touchStartX
    const index = this.data.activeIndex
    
    let xMove = Math.max(-this.data.deleteWidth, Math.min(0, deltaX))
    
    const pollList = [...this.data.pollList]
    pollList[index].xMove = xMove
    
    this.setData({ pollList })
  },

  handleTouchEnd(e) {
    if (this.data.activeIndex === null) return
    
    const index = this.data.activeIndex
    const { pollList } = this.data
    const item = pollList[index]
    
    // 降低触发阈值，让滑动更容易展开
    let xMove = 0
    if (Math.abs(item.xMove) >= this.data.deleteWidth / 3) { // 改为三分之一
      xMove = -this.data.deleteWidth
    }
    
    this.updateItemMove(index, xMove)
    this.setData({ activeIndex: null })
  },

  // 更新列表项的位置
  updateItemMove(index, xMove) {
    const { pollList } = this.data
    
    // 关闭其他已展开的项
    pollList.forEach((item, idx) => {
      if (idx !== index) {
        item.xMove = 0
      }
    })
    
    // 更新当前项的位置
    pollList[index].xMove = xMove
    
    this.setData({ pollList })
  },

  // 处理删除
  handleDelete(e) {
    const index = e.currentTarget.dataset.index;
    wx.showModal({
      title: '确认删除',
      content: '您确定要删除这个投票吗？',
      success: (res) => {
        if (res.confirm) {
          const pollId = this.data.pollList[index]._id;
          this.deletePoll(pollId);
        }
      }
    });
  },

  // 日期格式化方法
  formatDate(timestamp) {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 跳转到创建投票页面
  goToCreate() {
    wx.navigateTo({
      url: '/pages/poll/create/index'
    })
  },

  // 跳转到投票详情页面
  goToPollDetail(e) {
    const pollId = e.currentTarget.dataset.pollId
    wx.navigateTo({
      url: `/pages/poll/detail/index?pollId=${pollId}`
    })
  },

  // 删除投票
  async deletePoll(pollId) {
    try {
      const db = wx.cloud.database()
      await db.collection('polls').doc(pollId).remove()
      
      const updatedPollList = this.data.pollList.filter(poll => poll._id !== pollId)
      this.setData({ pollList: updatedPollList })

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
    } catch (err) {
      this.handleError('删除失败', err)
    }
  },

  // 添加缺失的handleTouchStart方法
  handleTouchStart(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      touchStartX: e.touches[0].clientX,
      activeIndex: index
    })
  },

  // 统一错误处理方法
  handleError(message, err) {
    wx.showToast({
      title: message,
      icon: 'none'
    })
  },

  // 添加回 onMovableChange 方法
  onMovableChange(e) {
    const { index } = e.currentTarget.dataset
    const { x } = e.detail
    
    // 如果不是当前激活的项，直接返回
    if (index !== this.data.activeIndex) return
    
    // 更新滑动位置
    const { pollList } = this.data
    pollList[index].xMove = x
    this.setData({ pollList })
  }
})
