import { pollTemplates } from '../../../config/poll-templates';

Page({
  data: {
    templates: []
  },

  onLoad() {
    console.log('Template data:', pollTemplates.templates);
    this.setData({
      templates: pollTemplates.templates
    });
    console.log('Page data after setData:', this.data.templates);
  },

  onTemplateSelect(e) {
    console.log('Selected template index:', e.currentTarget.dataset.index);
    const template = this.data.templates[e.currentTarget.dataset.index].template;
    console.log('Selected template:', template);
    wx.navigateTo({
      url: '/pages/poll/create/index',
      success: function(res) {
        res.eventChannel.emit('setTemplate', template)
      }
    })
  }
}) 