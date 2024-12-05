Page({
  data: {
    title: '',
    options: ['', ''],  // 默认两个空选项
    canSubmit: false,
    pollOptions: ['', ''],
    templateId: null,
    templateData: null,
    endTime: null
  },

  onLoad(options) {
    const { templateId } = options
    if (templateId) {
      this.loadTemplateData(templateId)
    }
    this.checkCanSubmit()
  },

  async loadTemplateData(templateId) {
    try {
      const db = wx.cloud.database({
        env: getApp().globalData.cloudEnv
      })

      const { data } = await db.collection('poll_templates')
        .doc(templateId)
        .get()

      this.setData({
        title: data.title,
        options: data.options,
        templateId: templateId,
        templateData: data
      })
      this.checkCanSubmit()
    } catch (error) {
      wx.showToast({
        title: '加载模版失败',
        icon: 'none'
      })
    }
  },

  onTitleInput(e) {
    this.setData({
      title: e.detail.value.trim()
    })
    this.checkCanSubmit()
  },

  onOptionInput(e) {
    const { index } = e.currentTarget.dataset
    const { value } = e.detail
    const options = [...this.data.options]
    options[index] = value.trim()
    
    // 如果当前输入的是最后一个选项，且有内容，则自动添加新选项
    if (index === options.length - 1 && value.trim() && options.length < 10) {
      options.push('')
    }
    
    this.setData({ options })
    this.checkCanSubmit()
  },

  addOption() {
    if (this.data.options.length >= 10) {
      wx.showToast({
        title: '最多10个选项',
        icon: 'none'
      })
      return
    }

    const options = [...this.data.options, '']
    this.setData({ options })
  },

  removeOption(e) {
    const { index } = e.currentTarget.dataset
    const options = this.data.options.filter((_, i) => i !== index)
    
    this.setData({ options })
    this.checkCanSubmit()
  },

  checkCanSubmit() {
    const titleValid = this.data.title.length > 0
    const optionsValid = this.data.options.filter(opt => opt.trim().length > 0).length >= 2
    
    this.setData({
      canSubmit: titleValid && optionsValid
    })
  },

  async createPoll() {
    if (!this.data.canSubmit) return

    const title = this.data.title.trim()
    const options = this.data.options.filter(opt => opt.trim().length > 0)

    if (options.length < 2) {
      wx.showToast({
        title: '至少需要2个选项',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '创建中...',
      mask: true
    })

    try {
      const db = wx.cloud.database()
      const result = await db.collection('polls').add({
        data: {
          title,
          options,
          createTime: Date.now(),
          endTime: Date.now() + 24 * 60 * 60 * 1000, // 24小时后结束
          votes: {},  // 初始化空的投票记录
          voters: []  // 初始化空的投票者列表
        }
      })

      wx.hideLoading()
      
      if (result._id) {
        // 获取列表页实例
        const pages = getCurrentPages()
        const listPage = pages.find(p => p.route === 'pages/poll/list/index')
        
        if (listPage) {
          // 获取 poll-storage 组件
          const pollStorage = listPage.selectComponent('#pollStorage')
          if (pollStorage) {
            // 直接添加到缓存
            const newPoll = {
              _id: result._id,
              title,
              options,
              createTime: Date.now(),
              endTime: Date.now() + 24 * 60 * 60 * 1000,
              votes: {},
              voters: [],
              _openid: listPage.data.openid
            }
            pollStorage.addToCache(newPoll)
          }
        }

        wx.showToast({
          title: '创建成功',
          icon: 'success',
          duration: 1500
        })

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/poll/detail/index?pollId=${result._id}`
          })
        }, 1500)
      }
    } catch (err) {
      wx.hideLoading()
      wx.showModal({
        title: '创建失败',
        content: '请稍后重试',
        showCancel: false
      })
    }
  }
})
