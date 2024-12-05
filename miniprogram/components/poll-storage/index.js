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
    },

    async sync() {
      try {
        const db = wx.cloud.database()
        const { data } = await db.collection('polls')
          .where({
            _openid: this.properties.openid
          })
          .orderBy('createTime', 'desc')
          .get()

        // 更新缓存
        this.updateCache(data)
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