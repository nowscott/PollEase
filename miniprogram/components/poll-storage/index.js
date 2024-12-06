Component({
  properties: {
    openid: {
      type: String,
      value: ''
    }
  },

  data: {
    syncTimer: null,
    isFirstSync: true, // 标志位: 是否首次同步
  },

  lifetimes: {
    attached() {
      this.startAutoSync();
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

    // 启动自动同步
    startAutoSync() {
      let syncInterval = 60 * 1000; // 初始同步间隔 1 分钟

      const timer = setInterval(() => {
        this.sync().then(success => {
          if (success && this.data.isFirstSync) {
            syncInterval = 5 * 60 * 1000; // 第一次同步后改为 5 分钟
            clearInterval(this.data.syncTimer);
            this.startAutoSync(); // 重新启动定时器
          }
        });
      }, syncInterval);

      this.setData({ syncTimer: timer, isFirstSync: true });

      if (this.properties.openid) {
        this.sync();
      }
    },

    // 全量同步
    async performFullSync() {
      try {
        const db = wx.cloud.database();

        const { data } = await db.collection('polls')
          .where({
            _openid: this.properties.openid
          })
          .orderBy('createTime', 'desc')
          .get();

        // 全量覆盖缓存
        this.updateCache(data);
        console.log('全量同步完成');
      } catch (err) {
        console.error('全量同步失败:', err);
      }
    },

    // 增量同步
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

        // 合并服务器数据和本地缓存
        const cache = this.getCache();
        const mergedData = [...data, ...cache.data].reduce((unique, item) => {
          if (!unique.some(poll => poll._id === item._id)) {
            unique.push(item);
          }
          return unique;
        }, []);

        // 更新缓存
        this.updateCache(mergedData);

        console.log('增量同步完成');
        return true;
      } catch (err) {
        console.error('增量同步失败:', err);

        // 触发错误事件
        this.triggerEvent('syncError', { error: err });

        return false;
      }
    },

    // 获取缓存
    getCache() {
      return wx.getStorageSync('pollStorage') || {
        data: []
      };
    },

    // 更新缓存
    updateCache(newData) {
      wx.setStorageSync('pollStorage', {
        data: newData
      });

      this.triggerEvent('cacheUpdate', {
        data: newData
      });
    },

    // 添加到缓存
    addToCache(poll) {
      const cache = this.getCache();
      const newData = [poll, ...cache.data];
      this.updateCache(newData);
    },

    // 从缓存移除
    removeFromCache(pollId) {
      const cache = this.getCache();
      const newData = cache.data.filter(p => p._id !== pollId);
      this.updateCache(newData);
    },

    // 清空缓存并执行全量同步
    clearCache() {
      wx.removeStorageSync('pollStorage');
      this.performFullSync(); // 全量同步
    }
  }
});
