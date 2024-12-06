Component({
  properties: {
    openid: {
      type: String,
      value: ''
    }
  },

  data: {
    syncTimer: null,
  },

  lifetimes: {
    attached() {
    },

    detached() {
      if (this.data.syncTimer) {
        clearInterval(this.data.syncTimer);
      }
    }
  },

  methods: {
    // 从缓存加载数据
    loadFromCache() {
      const cache = this.getCache();
      this.triggerEvent('cacheUpdate', {
        data: cache.data || []
      });
      return cache.data || [];
    },

    // 简化同步逻辑
    async sync() {
      try {
        if (!this.properties.openid) {
          console.log('同步失败: openid 为空');
          return false;
        }

        const db = wx.cloud.database();

        // 从服务器获取最新数据
        const { data } = await db.collection('polls')
          .where({
            _openid: this.properties.openid
          })
          .orderBy('createTime', 'desc')
          .limit(20)
          .get();

        // 直接更新缓存
        this.updateCache(data);

        console.log('同步完成');
        return true;
      } catch (err) {
        console.error('同步失败:', err);

        // 触发错误事件
        this.triggerEvent('syncError', { error: err });

        return false;
      }
    },

    // 获取缓存
    getCache() {
      const data = wx.getStorageSync('pollCache') || [];
      return { data };
    },

    // 更新缓存
    updateCache(newData) {
      wx.setStorageSync('pollCache', newData);
      this.triggerEvent('cacheUpdate', {
        data: newData
      });
    }
  }
});
