const app = getApp();

Page({
  data: {
    voteCount: '0',
    participantCount: '0',
    githubLink: 'https://github.com/nowscott',
    xiaohongshuLink: 'https://www.xiaohongshu.com/user/profile/5d40f52f000000001101ba6c?xhsshare=CopyLink&appuid=5d40f52f000000001101ba6c&apptime=1733669337&share_id=7c99ca72ee424efe896177e160a51ff6',
    email: 'nowscott@qq.com'
  },

  onLoad: function () {
    // 设置页面高度等信息
    this.setData({
      version: app.globalData.version,
      statusBarHeight: app.globalData.statusBarHeight,
      titleBarHeight: app.globalData.titleBarHeight,
      tabBarHeight: app.globalData.tabBarHeight,
      pageHeight: app.globalData.pageHeight,
      pageTopy: app.globalData.pageTopy
    });

    // 获取统计数据
    this.getStatistics();
  },

  // 获取统计数据
  getStatistics: async function () {
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
  copyGithub: function () {
    wx.setClipboardData({
      data: this.data.githubLink,
      success: function () {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        });
      }
    });
  },

  // 复制小红书链接
  copyXiaohongshu: function () {
    wx.setClipboardData({
      data: this.data.xiaohongshuLink,
      success: function () {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        });
      }
    });
  },

  // 复制邮箱
  copyEmail: function () {
    wx.setClipboardData({
      data: this.data.email,
      success: function () {
        wx.showToast({
          title: '邮箱已复制',
          icon: 'success'
        });
      }
    });
  }
});
