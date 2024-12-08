const app = getApp();

Page({
  data: {
    statusBarHeight: 0,
    titleBarHeight: '',
    tabBarHeight: '',
    pageHeight: '',
    voteCount: '0',
    participantCount: '0',
    githubLink: 'https://github.com/nowscott',
    xiaohongshuLink: 'https://xiaohongshu.com/user/profile',
    email: 'nowscott@qq.com'
  },

  onLoad: function() {
    // 设置页面高度等信息
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      titleBarHeight: app.globalData.titleBarHeight,
      tabBarHeight: app.globalData.tabBarHeight,
      pageHeight: app.globalData.pageHeight
    });

    // 获取统计数据
    this.getStatistics();
  },

  // 获取统计数据
  getStatistics: async function() {
    try {
      // 调用云函数获取或初始化统计数据
      const result = await wx.cloud.callFunction({
        name: 'updateStatistics',
        data: { type: 'init' }
      });

      if (result && result.result && result.result.data) {
        const stats = result.result.data;
        this.setData({
          voteCount: String(stats.voteCount || 0),
          participantCount: String(stats.participantCount || 0)
        });
      } else {
        throw new Error('未获取到统计数据');
      }
    } catch (err) {
      console.error('获取统计数据失败：', err);
      // 显示默认值
      this.setData({
        voteCount: '0',
        participantCount: '0'
      });
    }
  },

  // 复制 Github 链接
  copyGithub: function() {
    wx.setClipboardData({
      data: this.data.githubLink,
      success: function() {
        wx.showToast({
          title: 'Github链接已复制',
          icon: 'success'
        });
      }
    });
  },

  // 复制小红书链接
  copyXiaohongshu: function() {
    wx.setClipboardData({
      data: this.data.xiaohongshuLink,
      success: function() {
        wx.showToast({
          title: '小红书链接已复制',
          icon: 'success'
        });
      }
    });
  },

  // 复制邮箱
  copyEmail: function() {
    wx.setClipboardData({
      data: this.data.email,
      success: function() {
        wx.showToast({
          title: '邮箱已复制',
          icon: 'success'
        });
      }
    });
  }
});
