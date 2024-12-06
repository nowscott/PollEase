// 投票列表页面
const app = getApp()

Page({
  data: {
    pollList: [],
    loading: false,
    error: null,
    openid: '',
    deleteWidth: 160,
    touchStartX: 0,
    activeIndex: null,
    needRefresh: false
  },

  onLoad() {
    this.getUserInfo().then(() => {
      const pollStorage = this.selectComponent('#pollStorage')
      if (pollStorage) {
        const cacheData = pollStorage.loadFromCache()
        this.processPollData(cacheData)
      }
      this.fetchPollList(true)
    })
  },

  onShow() {
    if (this.data.needRefresh) {
      this.fetchPollList()
      this.setData({ needRefresh: false })
    }
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenid',
        config: {
          env: wx.cloud.DYNAMIC_CURRENT_ENV
        }
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
  async fetchPollList(silent = false) {
    if (!this.data.openid) return

    if (!silent) {
      this.setData({ loading: true })
    }

    const pollStorage = this.selectComponent('#pollStorage')
    
    if (!pollStorage) {
      console.error('poll-storage 组件未找到')
      this.setData({ loading: false })
      return
    }

    try {
      await pollStorage.sync()
      
      const cache = pollStorage.getCache()
      this.processPollData(cache.data)

    } catch (err) {
      console.error('获取列表失败:', err)
      this.handleError('获取列表失败', err)
      this.setData({ loading: false })
    }
  },

  // 合并触摸处理逻辑
  handleTouchMove(e) {
    if (this.data.activeIndex === null) return
    
    const moveX = e.touches[0].clientX
    const deltaX = moveX - this.data.touchStartX
    const index = this.data.activeIndex
    
    // 计算滑动距离和删除按钮宽度
    const baseWidth = this.data.deleteWidth
    let xMove = 0
    let deleteWidth = baseWidth
    
    if (deltaX < 0) {
      const absMove = Math.abs(deltaX)
      if (absMove <= baseWidth) {
        // 正常滑动范围内
        xMove = deltaX
        deleteWidth = baseWidth
      } else if (absMove <= baseWidth * 1.2) {
        // 超出范围，拉伸删除按钮
        xMove = -absMove
        deleteWidth = absMove
      } else {
        // 限制最大值
        xMove = -baseWidth * 4
        deleteWidth = baseWidth * 4
      }
    }
    
    const pollList = [...this.data.pollList]
    pollList[index].xMove = xMove
    pollList[index].deleteWidth = deleteWidth
    
    this.setData({ pollList })
  },

  handleTouchEnd(e) {
    if (this.data.activeIndex === null) return
    
    const index = this.data.activeIndex
    const { pollList } = this.data
    const item = pollList[index]
    
    // 重删除按钮宽度
    pollList[index].deleteWidth = this.data.deleteWidth
    
    // 如果滑动距离超过删除按钮宽度的1.4倍，触发删除操作
    if (Math.abs(item.xMove) > this.data.deleteWidth * 2.4) {
      const pollId = item._id
      this.deletePoll(pollId)
      return
    }
    
    // 普通左滑逻辑
    let xMove = 0
    if (Math.abs(item.xMove) >= this.data.deleteWidth / 3) {
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
    const poll = this.data.pollList?.[index];
    
    if (!poll || !poll._id) {
      wx.showToast({
        title: '投票数据无效',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '您确定要删除这个投票吗？',
      success: (res) => {
        if (res.confirm) {
          this.deletePoll(poll._id);
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

  // 跳转到投票详情页面
  goToPollDetail(e) {
    const pollId = e.currentTarget.dataset.pollId
    
    // 直接跳转
    wx.navigateTo({
      url: `/pages/poll/detail/index?pollId=${pollId}`
    })
    
    // 同时触发同步，不等待结果
    const pollStorage = this.selectComponent('#pollStorage')
    if (pollStorage) {
      pollStorage.sync()
    }
  },

  // 删除投票
  async deletePoll(pollId) {
    try {
      const db = wx.cloud.database()
      await db.collection('polls').doc(pollId).remove()
      
      // 使用 id 选择器
      const pollStorage = this.selectComponent('#pollStorage')
      if (pollStorage) {
        pollStorage.removeFromCache(pollId)
      }

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
  },

  // 添加缓存更新的处理方法
  onCacheUpdate(e) {
    const { data } = e.detail
    const pollList = data.map(poll => ({
      ...poll,
      totalVotes: poll.votes ? 
        Object.values(poll.votes).reduce((a, b) => a + b, 0) : 0,
      endTimeStr: this.formatDate(poll.endTime),
      xMove: 0,
      deleteWidth: this.data.deleteWidth
    }))

    this.setData({ pollList })
  },

  // 处理投票数据的公共方法
  processPollData(data) {
    const pollList = (data || []).map(poll => ({
      ...poll,
      totalVotes: poll.votes ? 
        Object.values(poll.votes).reduce((a, b) => a + b, 0) : 0,
      endTimeStr: this.formatDate(poll.endTime),
      xMove: 0,
      deleteWidth: this.data.deleteWidth
    }))

    this.setData({
      pollList,
      loading: false,
      error: null
    })
  }
})