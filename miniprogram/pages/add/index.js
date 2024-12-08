Page({
  data: {
    title: '',
    options: ['', ''],  // 默认两个空选项
    canSubmit: false,
    templateId: null,
    templateData: null,
    description: '',
    openid: ''
  },

  onLoad(options) {
    // 获取全局数据
    const app = getApp();
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      titleBarHeight: app.globalData.titleBarHeight,
      tabBarHeight: app.globalData.tabBarHeight,
      pageHeight: app.globalData.pageHeight,
      pageTopy: app.globalData.pageTopy
    });
    const { templateId } = options
    if (templateId) {
      this.loadTemplateData(templateId)
    }
    // 获取事件通道，需要判断是否存在
    const eventChannel = this.getOpenerEventChannel ? this.getOpenerEventChannel() : null;
    if (eventChannel && typeof eventChannel.on === 'function') {
      eventChannel.on('setTemplate', template => {
        if (template) {
          const options = [...template.options, '']
          this.setData({
            title: template.title,
            description: template.description || '',
            options: options
          })
          this.checkCanSubmit()
        }
      })
    }

    // 获取用户 openid
    this.getUserInfo()
  },

  async getUserInfo() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenid'
      })

      if (!result || !result.openid) {
        throw new Error('无法获取用户标识')
      }

      this.setData({ openid: result.openid })
    } catch (err) {
      console.error('获取用户信息失败:', err)
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      })
    }
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
        description: data.description || '',
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
    if (!this.data.openid) {
      wx.showToast({
        title: '请稍后重试',
        icon: 'none'
      })
      return
    }

    const title = this.data.title.trim()
    const description = this.data.description.trim()
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
      const pollData = {
        title,
        description,
        options,
        creatorId: this.data.openid,
        createTime: db.serverDate(),
        endTime: db.serverDate({ offset: 24 * 60 * 60 * 1000 }), // 24小时后结束
        voters: [],
        votes: {}
      }

      const result = await db.collection('polls').add({
        data: pollData
      })

      // 更新统计数据
      await wx.cloud.callFunction({
        name: 'updateStatistics',
        data: { type: 'vote' }
      })

      wx.hideLoading()

      if (result._id) {
        // 获取列表页实例
        const pages = getCurrentPages()
        const listPage = pages.find(p => p.route === 'pages/poll/home/index')

        if (listPage) {
          // 获取 poll-storage 组件
          const pollStorage = listPage.selectComponent('#pollStorage')
          if (pollStorage) {
            // 直接添加到缓存
            const newPoll = {
              _id: result._id,
              title,
              description,
              options,
              createTime: Date.now(),
              endTime: Date.now() + 24 * 60 * 60 * 1000,  // 使用本地时间计算
              votes: {},
              voters: [],
              _openid: this.data.openid  // 在缓存中可以使用 _openid
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
          // 先清除当前页面栈，再跳转到详情页
          wx.reLaunch({
            url: `/pages/detail/index?pollId=${result._id}`
          })
        }, 1500)
      }
    } catch (err) {
      console.error('创建投票失败:', err)  // 添加错误日志
      wx.hideLoading()
      wx.showModal({
        title: '创建失败',
        content: err.message || '请稍后重试',  // 显示具体错误信息
        showCancel: false
      })
    }
  },

  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    })
  },

  onBackButtonTap() {
    wx.navigateBack({
      delta: 1 // Go back one page
    });
  }
})
