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
    // 获取用户信息
    this.getUserInfo().then(() => {
      // 从本地缓存加载数据
      const pollStorage = this.selectComponent('#pollStorage')
      if (pollStorage) {
        const cacheData = pollStorage.loadFromCache()
        this.processPollData(cacheData)
      }
      this.fetchPollList(true)
    })
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const tabBarHeight = systemInfo.screenHeight - systemInfo.windowHeight - statusBarHeight;
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const titleBarHeight = menuButton.bottom - menuButton.top + 2 * (menuButton.top - statusBarHeight);
    const pageHeight = systemInfo.screenHeight + titleBarHeight;
    // 传递数据
    this.setData({
      statusBarHeight: statusBarHeight + 'px',
      titleBarHeight: titleBarHeight + 'px',
      tabBarHeight: tabBarHeight + 'px',
      pageHeight: pageHeight + 'px'
    });
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

  // 跳转到投票详情页面
  goToPollDetail(e) {
    const pollId = e.currentTarget.dataset.pollId;
    console.log('Navigating to poll detail with pollId:', pollId);

    if (!pollId) {
      console.error('Poll ID is missing!');
      return;
    }

    // 直接跳转
    wx.navigateTo({
      url: `/pages/detail/index?pollId=${pollId}`,
      fail: function (err) {
        console.error('Navigation failed:', err);
      }
    });

    // 同时触发同步，不等待结果
    const pollStorage = this.selectComponent('#pollStorage');
    if (pollStorage) {
      pollStorage.sync();
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

  // 统一错误处理方法
  handleError(message, err) {
    wx.showToast({
      title: message,
      icon: 'none'
    })
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
  processPollData(data) {
    const { openid, selected } = this.data;
    const pollList = (data || []).filter(poll => {
      if (selected === 'initiated') {
        return poll.creatorId === openid;
      } else if (selected === 'joined') {
        return poll.voters && poll.voters.includes(openid);
      }
      return false;
    }).map(poll => ({
      ...poll,
      totalVotes: poll.votes ?
        Object.values(poll.votes).reduce((a, b) => a + b, 0) : 0,
      endTimeStr: this.formatDate(poll.endTime),
      title: this.truncateText(poll.title), // 使用截断函数处理标题
    }));
    this.setData({
      pollList,
      loading: false,
      error: null
    });
  },

  // 处理缓存更新事件
  onCacheUpdate(e) {
    const { data } = e.detail;
    this.setData({ pollList: data });
  },

  // 跳转到投票详情页面
  goToPollDetail(e) {
    const pollId = e.currentTarget.dataset.pollId;
    console.log('Navigating to poll detail with pollId:', pollId);

    if (!pollId) {
      console.error('Poll ID is missing!');
      return;
    }

    // 直接跳转
    wx.navigateTo({
      url: `/pages/detail/index?pollId=${pollId}`,
      fail: function (err) {
        console.error('Navigation failed:', err);
      }
    });

    // 同时触发同步，不等待结果
    const pollStorage = this.selectComponent('#pollStorage');
    if (pollStorage) {
      pollStorage.sync();
    }
  },

  // 切换到我发起的投票
  selectInitiated() {
    this.setData({ selected: 'initiated' });
    this.fetchPollList();
  },

  // 切换到我参与的投票
  selectJoined() {
    this.setData({ selected: 'joined' });
    this.fetchPollList();
  },

  // Example usage within a Page method
  exampleUsage() {
    let pollTitle = "这里是一个非常长的轮询标题示例，应该被截断";
    let displayTitle = this.truncateText(pollTitle);
    console.log(displayTitle); // 输出: "这里是一个非常长的..."
  },
})
