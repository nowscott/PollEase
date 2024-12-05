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
    // 立即从缓存加载数据
    loadFromCache() {
      const cache = this.getCache()
      this.triggerEvent('cacheUpdate', {
        data: cache.data || []
      })
      return cache.data || []
    },

    startAutoSync() {
      // 改为1分钟同步一次
      const timer = setInterval(() => {
        this.sync()
      }, 60 * 1000)
      
      this.setData({ syncTimer: timer })
      
      // 确保有 openid 才开始同步
      if (this.properties.openid) {
        this.sync()
      }
    },

    async sync() {
      try {
        if (!this.properties.openid) {
          console.log('同步失败: openid 为空')
          return false
        }

        const db = wx.cloud.database()
        
        // 获取服务器数据
        const { data } = await db.collection('polls')
          .where({
            _openid: this.properties.openid
          })
          .orderBy('createTime', 'desc')
          .limit(20)
          .get()

        // 直接使用服务器返回的数据更新缓存
        this.updateCache(data)
        
        console.log('同步完成')
        return true
      } catch (err) {
        console.error('同步失败:', err)
        return false
      }
    },

    getCache() {
      return wx.getStorageSync('pollStorage') || {
        data: []
      }
    },

    updateCache(newData) {
      wx.setStorageSync('pollStorage', {
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
    },

    clearCache() {
      wx.removeStorageSync('pollStorage')
      this.sync() // 重新从数据库同步数据
    }
  }
}) 