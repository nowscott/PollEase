import { pollTemplates } from '../../config/poll-templates';
const app = getApp();
Page({
  data: {
    templates: []
  },

  onLoad() {
    // 获取全局数据
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      titleBarHeight: app.globalData.titleBarHeight,
      tabBarHeight: app.globalData.tabBarHeight,
      pageHeight: app.globalData.pageHeight
    });
    this.setData({
      templates: pollTemplates.templates
    });
  },

  onTemplateSelect(e) {
    const selectedTemplate = this.data.templates[e.currentTarget.dataset.index];
    const template = {
      ...selectedTemplate.template,
      description: selectedTemplate.template.description || ''
    };
    wx.navigateTo({
      url: '/pages/add/index',
      success: function (res) {
        res.eventChannel.emit('setTemplate', template)
      },
      fail: function (err) {
        console.error('Navigation failed:', err);
      }
    })
  }
}) 