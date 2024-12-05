/**
 * 投票数据存储管理组件
 * 负责管理本地数据缓存和同步
 */
Component({
  properties: {
    openid: {
      type: String,
      value: ''
    }
  },

  data: {
    syncTimer: null
  },

  lifetimes: {
    attached() {
      this.startAutoSync()
    },
    
    detached() {
      if (this.data.syncTimer) {
        clearInterval(this.data.syncTimer)
      }
    }
  },

  methods: {
    startAutoSync() {
      // 每5分钟同步一次
      const timer = setInterval(() => {
        this.sync()
      }, 5 * 60 * 1000)
      
      this.setData({ syncTimer: timer })
      
      // 立即执行一次同步
      this.sync()
    },

    async sync() {
      try {
        const db = wx.cloud.database()
        
        const now = Date.now()
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000) // 一周前的时间戳
        
        // 只获取一周内的投票
        const { data } = await db.collection('polls')
          .where({
            _openid: this.properties.openid,
            endTime: db.command.gt(oneWeekAgo)
          })
          .orderBy('createTime', 'desc')
          .get()

        // 获取本地缓存
        const cache = this.getCache()
        
        // 过滤掉本地缓存中一周前的投票
        const validCacheData = cache.data.filter(poll => poll.endTime > oneWeekAgo)
        
        // 如果本地缓存数量与服务器数据不一致，说明有投票被删除或过期
        if (validCacheData.length !== data.length) {
          // 更新缓存为服务器数据
          this.updateCache(data)
        } else {
          // 更新缓存中的投票状态
          this.updateCache(validCacheData)
        }
        
        return true
      } catch (err) {
        console.error('同步失败:', err)
        return false
      }
    },

    getCache() {
      return wx.getStorageSync('pollCache') || {
        data: []
      }
    },

    updateCache(newData) {
      wx.setStorageSync('pollCache', {
        data: newData
      })
      
      this.triggerEvent('cacheUpdate', {
        data: newData
      })
    },

    addToCache(poll) {
      const cache = this.getCache()
      const newData = [poll, ...cache.data]
      this.updateCache(newData)
    },

    removeFromCache(pollId) {
      const cache = this.getCache()
      const newData = cache.data.filter(p => p._id !== pollId)
      this.updateCache(newData)
    }
  }
}) 