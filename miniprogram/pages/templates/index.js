import { pollTemplates } from '../../config/poll-templates';

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
    console.log('Selected template:', selectedTemplate);  
    const template = {
      ...selectedTemplate.template,
      description: selectedTemplate.template.description || ''
    };
    wx.navigateTo({
      url: '/pages/create/index',
      success: function(res) {
        console.log('Navigation success:', res);  
        res.eventChannel.emit('setTemplate', template)
      },
      fail: function(err) {
        console.error('Navigation failed:', err);  
      }
    })
  }
}) 