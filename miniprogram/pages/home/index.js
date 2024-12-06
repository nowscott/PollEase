// 投票列表页面
const app = getApp()

Page({
  // 页面的初始数据
  data: {
    pollList: [],
    loading: false,
    error: null,
    openid: '',
    selected: 'initiated',
    needRefresh: false,
  },

  onLoad() {
    this.performFullSync();
    // 获取全局数据
    const app = getApp();
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      titleBarHeight: app.globalData.titleBarHeight,
      tabBarHeight: app.globalData.tabBarHeight,
      pageHeight: app.globalData.pageHeight
    });
    // 获取用户信息
    this.getUserInfo().then(() => {
      const pollStorage = this.selectComponent('#pollStorage');
      if (pollStorage) {
        const cacheData = pollStorage.loadFromCache();
        this.processPollData(cacheData);
      }
      this.fetchPollList(true);
    });
  },

  onShow() {
    if (this.data.needRefresh) {
      this.setData({ needRefresh: false });
      this.fetchPollList(true);
    }
  },

  async performFullSync() {
    const pollStorage = this.selectComponent('#pollStorage');
    if (!pollStorage) {
      console.error('pollStorage 组件未找到');
      return;
    }

    try {
      await pollStorage.sync(); // 全量同步服务器数据
      const cache = pollStorage.getCache();

      if (cache && cache.data) {
        this.processPollData(cache.data);
        wx.showToast({
          title: '数据已更新',
          icon: 'success',
        });
      }
    } catch (err) {
      console.error('全量更新失败:', err);
      wx.showToast({
        title: '全量更新失败，请稍后重试',
        icon: 'none',
      });
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
      });

      if (!result || !result.openid) {
        throw new Error('无法获取用户标识');
      }

      this.setData({ openid: result.openid });
      return result.openid;

    } catch (err) {
      this.handleError('获取用户信息失败', err);
      return null;
    }
  },

  // 获取投票列表
  async fetchPollList(silent = false) {
    if (!this.data.openid) return;
    if (!silent) {
      this.setData({ loading: true });
    }
    const pollStorage = this.selectComponent('#pollStorage');
    if (!pollStorage) {
      console.error('pollStorage 组件未找到');
      this.setData({ loading: false });
      return;
    }
    try {
      await pollStorage.sync();
      const cache = pollStorage.getCache();

      console.log('增量同步后数据:', cache.data); // 调试输出
      this.processPollData(cache.data);
    } catch (err) {
      console.error('获取列表失败:', err);
      this.handleError('获取列表失败', err);
    } finally {
      if (!silent) {
        this.setData({ loading: false });
      }
    }
  },

  // 跳转到投票详情页面
  goToPollDetail(e) {
    const pollId = e.currentTarget.dataset.pollId;
    if (!pollId) {
      console.error('Poll ID is missing!');
      return;
    }

    wx.navigateTo({
      url: `/pages/detail/index?pollId=${pollId}`,
      fail: function (err) {
        console.error('Navigation failed:', err);
      }
    });
  },

  // 统一错误处理方法
  handleError(message, err) {
    wx.showToast({
      title: message,
      icon: 'none'
    });
  },

  // 日期格式化方法
  formatDate(timestamp) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.error('Invalid date format:', timestamp);
      return 'Invalid Date';
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 截断文本到16个字符并在需要时添加省略号
  truncateText(text) {
    if (text.length > 16) {
      return text.substring(0, 16) + '...';
    }
    return text;
  },

  // 处理投票数据的公共方法
  processPollData(newData) {
    const { openid, selected, pollList: existingData } = this.data;
    // 合并新旧数据，按 ID 去重
  const mergedData = [...newData, ...existingData].reduce((acc, poll) => {
    if (!acc.some(item => item._id === poll._id)) {
      acc.push(poll);
    }
    return acc;
  }, []);

    const pollList = (mergedData || []).filter(poll => {
      if (selected === 'initiated') {
        return poll.creatorId === openid;
      } else if (selected === 'joined') {
        return poll.voters && poll.voters.includes(openid);
      }
      return false;
    }).map(poll => ({
      ...poll,
      totalVotes: poll.votes
        ? Object.values(poll.votes).reduce((a, b) => a + b, 0)
        : 0,
      endTimeStr: poll.endTime ? this.formatDate(poll.endTime) : '未设置截止时间',
      title: this.truncateText(poll.title),
    }));

    this.setData({
      pollList,
      loading: false,
      error: null,
    });
  },

  // 处理缓存更新事件
  onCacheUpdate(e) {
    const { data } = e.detail;
    this.setData({ pollList: data });
  },

  // 切换到我发起的投票
  selectInitiated() {
    this.setData({ selected: 'initiated' });
    this.fetchPollList(true);
  },

  // 切换到我参与的投票
  selectJoined() {
    this.setData({ selected: 'joined' });
    this.fetchPollList(true);
  },

});
