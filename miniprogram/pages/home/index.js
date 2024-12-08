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
    isRefreshing: false
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      titleBarHeight: app.globalData.titleBarHeight,
      tabBarHeight: app.globalData.tabBarHeight,
      pageHeight: app.globalData.pageHeight
    });
    // 获取用户信息
    this.getUserInfo().then(() => {
      const cacheData = wx.getStorageSync('pollCache') || { initiatedData: [], joinedData: [] };
      this.processPollData(cacheData);
    });
  },

  onShow() {
    this.getUserInfo().then(openid => {
      if (openid) {
        const pollStorage = this.selectComponent('#pollStorage');
        if (pollStorage) {
          pollStorage.setData({ openid }); // 确保 openid 被传递到组件
          // 同步发起和参与的投票
          Promise.all([pollStorage.syncInitiated(), pollStorage.syncjoined()]).then(() => {
            const cacheData = wx.getStorageSync('pollCache') || { initiatedData: [], joinedData: [] };
            this.processPollData(cacheData);
          }).catch(err => {
            console.error('同步失败:', err);
          });
        } else {
          console.error('pollStorage 组件未找到');
        }
      } else {
        console.error('无法获取 openid，无法进行同步');
      }
    });
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

  // 处理缓存更新事件
  onCacheUpdate(e) {
    const { initiatedData, joinedData } = e.detail;
    this.processPollData({ initiatedData, joinedData });
  },

  // 处理投票数据的公共方法
  processPollData({ initiatedData, joinedData }) {
    let dataToDisplay = [];
    const safeFormatDate = date => {
      try {
        return this.formatDate(date);
      } catch {
        return '格式化失败';
      }
    };

    const safeTruncateText = text => {
      try {
        return this.truncateText(text);
      } catch {
        return text || '';
      }
    };

    const formatPoll = ({ _id, creatorId, voters, votes, endTime, title }) => ({
      _id,
      creatorId,
      voters,
      totalVotes: votes ? Object.values(votes).reduce((a, b) => a + b, 0) : 0,
      endTimeStr: endTime ? safeFormatDate(endTime) : '未设置截止时间',
      title: safeTruncateText(title),
    });

    if (this.data.selected === 'initiated') {
      dataToDisplay = initiatedData.map(formatPoll);
    } else if (this.data.selected === 'joined') {
      dataToDisplay = joinedData.map(formatPoll);
    }

    this.setData({
      pollList: dataToDisplay
    });
  },

  // 切换到我发起的投票
  selectInitiated() {
    this.setData({ selected: 'initiated' });
    const cacheData = wx.getStorageSync('pollCache') || { initiatedData: [], joinedData: [] };
    this.processPollData(cacheData);
  },

  // 切换到我参与的投票
  selectJoined() {
    this.setData({ selected: 'joined' });
    const cacheData = wx.getStorageSync('pollCache') || { initiatedData: [], joinedData: [] };
    this.processPollData(cacheData);
  },

  // 处理刷新按钮点击
  async onRefreshTap() {
    if (this.data.isRefreshing) return;
    
    this.setData({ isRefreshing: true });
    wx.showLoading({
      title: '刷新中...',
    });

    try {
      const pollStorage = this.selectComponent('#pollStorage');
      if (!pollStorage) {
        throw new Error('pollStorage 组件未找到');
      }

      // 同步发起和参与的投票
      await Promise.all([pollStorage.syncInitiated(), pollStorage.syncjoined()]);
      const cacheData = wx.getStorageSync('pollCache') || { initiatedData: [], joinedData: [] };
      this.processPollData(cacheData);
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      wx.hideLoading();
      this.setData({ isRefreshing: false });
    }
  },
});
