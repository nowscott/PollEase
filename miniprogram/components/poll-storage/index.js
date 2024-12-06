Component({
  properties: {
    openid: {
      type: String,
      value: ''
    }
  },

  data: {
    syncTimer: null,
    initiatedCache: [] 
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
        initiatedData: cache.initiatedData || [],
        joinedData: cache.joinedData || []
      });
      return {
        initiatedData: cache.initiatedData || [],
        joinedData: cache.joinedData || []
      };
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
            voters: this.properties.openid
          })
          .orderBy('createTime', 'desc')
          .limit(20)
          .get();

        // 直接更新缓存
        this.updateCache({ joinedData: data });

        console.log('同步完成');
        return true;
      } catch (err) {
        console.error('同步失败:', err);

        // 触发错误事件
        this.triggerEvent('syncError', { error: err });

        return false;
      }
    },

    // 同步发起的投票
    async syncInitiated() {
      try {
        if (!this.properties.openid) {
          console.log('同步失败: openid 为空');
          return false;
        }

        const db = wx.cloud.database();

        // 从服务器获取发起的投票
        const { data } = await db.collection('polls')
          .where({
            _openid: this.properties.openid
          })
          .orderBy('createTime', 'desc')
          .limit(20)
          .get();

        this.updateCache({ initiatedData: data });
        return data;
      } catch (error) {
        console.error('同步发起的投票失败:', error);
        return false;
      }
    },

    // 从服务器获取参与的投票
    async syncjoined() {
      try {
        if (!this.properties.openid) {
          console.log('同步失败: openid 为空');
          return false;
        }

        const db = wx.cloud.database();

        // 从服务器获取参与的投票
        const { data } = await db.collection('polls')
          .where({
            voters: this.properties.openid
          })
          .orderBy('createTime', 'desc')
          .limit(20)
          .get();

        this.updateCache({ joinedData: data });
        return data;
      } catch (error) {
        console.error('同步参与的投票失败:', error);
        return false;
      }
    },

    // 获取缓存
    getCache() {
      const data = wx.getStorageSync('pollCache') || { initiatedData: [], joinedData: [] };
      return data;
    },

    // 更新缓存
    updateCache(newData) {
      const cache = this.getCache();
      const updatedCache = {
        ...cache,
        ...newData
      };
      wx.setStorageSync('pollCache', updatedCache);
      this.triggerEvent('cacheUpdate', {
        initiatedData: updatedCache.initiatedData,
        joinedData: updatedCache.joinedData
      });
    }
  }
});
