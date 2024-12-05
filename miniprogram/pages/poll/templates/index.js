import { pollTemplates } from '../../../config/poll-templates';

Page({
  data: {
    templates: []
  },

  onLoad() {
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
      url: '/pages/poll/create/index',
      success: function(res) {
        res.eventChannel.emit('setTemplate', template)
      }
    })
  }
}) 