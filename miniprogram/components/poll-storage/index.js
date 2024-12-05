/**
 * 投票数据存储管理组件
 * 职责：
 * 1. 管理本地数据缓存
 * 2. 处理数据同步
 * 3. 提供数据CRUD接口
 */
Component({
  properties: {
    openid: String
  },

  data: {
    syncTimer: null
  },

  lifetimes: {
    attached() {
      // 启动定时同步
      this.startAutoSync()
    },
    
    detached() {
      // 清理定时器
      if (this.data.syncTimer) {
        clearInterval(this.data.syncTimer)
      }
    }
  },

  methods: {
    /**
     * 启动自动同步
     * @private
     */
    startAutoSync() {
      // 每5分钟同步一次
      const timer = setInterval(() => {
        this.sync()
      }, 5 * 60 * 1000)
      
      this.setData({ syncTimer: timer })
    },

    /**
     * 同步数据
     * @public
     */
    async sync() {
      const cache = this.getCache()
      const lastSync = cache.syncTime || 0
      
      try {
        const db = wx.cloud.database()
        const { data } = await db.collection('polls')
          .where({
            _openid: this.properties.openid,
            updateTime: db.command.gt(lastSync)
          })
          .orderBy('createTime', 'desc')
          .get()

        if (data.length > 0) {
          this.updateCache(data)
        }
        
        return true
      } catch (err) {
        console.error('同步失败:', err)
        return false
      }
    },

    /**
     * 获取缓存数据
     * @private
     */
    getCache() {
      return wx.getStorageSync('pollCache') || {
        syncTime: 0,
        data: []
      }
    },

    /**
     * 更新缓存
     * @private
     * @param {Array} newData - 新数据
     */
    updateCache(newData) {
      const cache = this.getCache()
      const merged = this.mergeData(cache.data, newData)
      
      const newCache = {
        syncTime: Date.now(),
        data: merged
      }
      
      wx.setStorageSync('pollCache', newCache)
      
      // 通知数据更新
      this.triggerEvent('cacheUpdate', {
        data: merged
      })
    },

    /**
     * 合并数据，保持唯一性和顺序
     * @private
     */
    mergeData(oldData, newData) {
      const dataMap = new Map()
      
      // 先放入旧数据
      oldData.forEach(item => {
        dataMap.set(item._id, item)
      })
      
      // 用新数据覆盖或添加
      newData.forEach(item => {
        dataMap.set(item._id, item)
      })
      
      // 转回数组并排序
      return Array.from(dataMap.values())
        .sort((a, b) => b.createTime - a.createTime)
    },

    /**
     * 添加新投票到缓存
     * @public
     */
    addToCache(poll) {
      const cache = this.getCache()
      const newCache = {
        syncTime: Date.now(),
        data: [poll, ...cache.data]
      }
      
      wx.setStorageSync('pollCache', newCache)
      this.triggerEvent('cacheUpdate', {
        data: newCache.data
      })
    },

    /**
     * 从缓存中删除投票
     * @public
     */
    removeFromCache(pollId) {
      const cache = this.getCache()
      const newCache = {
        syncTime: Date.now(),
        data: cache.data.filter(p => p._id !== pollId)
      }
      
      wx.setStorageSync('pollCache', newCache)
      this.triggerEvent('cacheUpdate', {
        data: newCache.data
      })
    }
  }
}) 