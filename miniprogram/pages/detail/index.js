// pages/poll/detail/index.js
const app = getApp()

Page({
  data: {
    pollId: null,
    poll: null,
    loading: true,
    error: null,
    hasVoted: false,
    isExpired: false,
    openid: '',
    showVoteModal: false,  // 添加投票弹窗状态
    selectedOption: null   // 添加选中选项状态
  },

  onLoad(options) {
    // 获取全局数据
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      titleBarHeight: app.globalData.titleBarHeight,
      tabBarHeight: app.globalData.tabBarHeight,
      pageHeight: app.globalData.pageHeight,
      pageTopy: app.globalData.pageTopy
    });
    const { pollId } = options
    if (!pollId) {
      wx.showModal({
        title: '错误',
        content: '无效的投票ID',
        showCancel: false,
        complete: () => wx.navigateBack()
      })
      return
    }

    this.setData({ pollId })

    // 从本地存储获取投票状态
    const votedPolls = wx.getStorageSync('votedPolls') || {}
    const hasVoted = !!votedPolls[pollId]
    this.setData({ hasVoted })
    // 确保云开发环境初始化
    if (!wx.cloud) {
      wx.cloud.init({
        traceUser: true,
        env: wx.cloud.DYNAMIC_CURRENT_ENV
      })
    }

    this.initPageData()
  },

  // 修改 onShow 生命周期函数
  onShow() {
    // 每次显示页面时都重新初始化数据
    if (this.data.pollId) {
      // 重置状态
      this.setData({
        hasVoted: false,  // 重置投票状态
        poll: null,       // 清空投票数据
        loading: true     // 显示加载状态
      });
      // 重新获取数据
      this.initPageData();
    }
  },
  // 修改 initPageData 方法，确保每次都重新获取投票状态
  async initPageData() {
    try {
      // 先尝试获取 openid
      const openid = await this.getUserInfo()

      // 获取投票状态
      if (openid) {
        const { result } = await wx.cloud.callFunction({
          name: 'getUserVoteStatus',
          data: {
            pollId: this.data.pollId
          }
        });

        // 根据云函数返回结果设置投票状态
        this.setData({
          hasVoted: result && result.hasVoted
        });

        // 如果已投票，更新本地存储
        if (result && result.hasVoted) {
          const votedPolls = wx.getStorageSync('votedPolls') || {}
          votedPolls[this.data.pollId] = true
          wx.setStorageSync('votedPolls', votedPolls)
        }
      }

      // 获取并刷新投票详情
      await this.fetchPollDetail()
    } catch (err) {
      console.error('初始化页面失败:', err)
      this.fetchPollDetail() // 即使出错也尝试加载投票详情
    }
  },

  // 简化获取用户信息的方法
  async getUserInfo() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenid'
      })

      if (result && result.openid) {
        this.setData({ openid: result.openid })
        return result.openid
      }
      return null
    } catch (err) {
      console.error('获取用户信息失败:', err)
      return null
    }
  },

  // 修改提交投票的方法
  async submitVote(e) {
    // 使用原始索引而不是排序后的索引
    const optionIndex = e.currentTarget.dataset.originalIndex

    if (optionIndex === undefined || optionIndex === null) {
      wx.showToast({
        title: '无效的选项',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '提交中...'
    })

    try {
      // 如果没有 openid，尝试重新获取
      if (!this.data.openid) {
        const openid = await this.getUserInfo()
        if (!openid) {
          wx.hideLoading()
          wx.showToast({
            title: '无法获取用户信息，请稍后重试',
            icon: 'none'
          })
          return
        }
      }

      const { result } = await wx.cloud.callFunction({
        name: 'submitVote',
        data: {
          pollId: this.data.pollId,
          optionIndex: parseInt(optionIndex) // 确保 optionIndex 是数字
        }
      })

      if (result.success) {
        // 保存投票状态到本地存储
        const votedPolls = wx.getStorageSync('votedPolls') || {}
        votedPolls[this.data.pollId] = true
        wx.setStorageSync('votedPolls', votedPolls)

        // 更新统计数据
        await wx.cloud.callFunction({
          name: 'updateStatistics',
          data: { type: 'participant' }
        });

        this.setData({
          hasVoted: true
        })

        wx.showToast({
          title: '投票成功',
          icon: 'success'
        })
      }

      await this.fetchPollDetail()

    } catch (err) {
      console.error('提交投票失败:', err, '选项索引:', optionIndex)
      wx.hideLoading()
      wx.showToast({
        title: '投票失败，请重试',
        icon: 'none'
      })
    }
  },

  // 修改 fetchPollDetail 方法
  async fetchPollDetail() {
    try {
      // 先尝试获取 openid（如果还没有的话）
      if (!this.data.openid) {
        await this.getUserInfo()
      }

      const db = wx.cloud.database()
      const { data } = await db.collection('polls').doc(this.data.pollId).get()

      if (!data) {
        throw new Error('投票不存在')
      }

      // 检查是否已过期
      const now = Date.now()
      const isExpired = now > data.endTime

      let hasVoted = false
      if (this.data.openid && data.voters && Array.isArray(data.voters)) {
        hasVoted = data.voters.some(voter => {
          if (typeof voter === 'string') {
            return voter === this.data.openid
          }
          return voter && voter.openid === this.data.openid
        })

        // 如果在数据库中发现已投票，更新本地存储
        if (hasVoted) {
          const votedPolls = wx.getStorageSync('votedPolls') || {}
          votedPolls[this.data.pollId] = true
          wx.setStorageSync('votedPolls', votedPolls)
        }
      }

      // 如果本地存储显示已投票，也将状态设置为已投票
      const votedPolls = wx.getStorageSync('votedPolls') || {}
      hasVoted = hasVoted || !!votedPolls[this.data.pollId]

      // 初始化投票数据
      const votes = {}
      data.options.forEach((_, index) => {
        votes[index] = 0
      })

      if (data.votes) {
        Object.keys(data.votes).forEach(key => {
          votes[key] = parseInt(data.votes[key]) || 0
        })
      }

      // 修改选项排序逻辑 - 始终按票数降序排序
      const sortedOptions = data.options.map((option, index) => ({
        text: option,
        originalIndex: index,  // 保存原始索引用于提交投票
        votes: votes[index] || 0
      })).sort((a, b) => {
        // 首先按票数降序
        if (b.votes !== a.votes) {
          return b.votes - a.votes
        }
        // 票数相同时，保持原始顺序
        return a.originalIndex - b.originalIndex
      })

      this.setData({
        poll: {
          ...data,
          votes,
          sortedOptions,
          createTimeStr: this.formatDate(data.createTime),
          endTimeStr: this.formatDate(data.endTime),
          voterCount: data.voters ? data.voters.length : 0
        },
        isExpired,
        hasVoted: hasVoted,  // 使用更新后的 hasVoted 值
        loading: false
      })

      wx.hideLoading()
    } catch (err) {
      console.error('获取投票详情失败:', err)
      wx.hideLoading()

      this.setData({
        loading: false,
        error: err.message || '获取投票详情失败'
      })

      wx.showToast({
        title: err.message || '加载失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 添加日期格式化方法
  formatDate(timestamp) {
    if (!timestamp) {
      return '未知时间'
    }
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 添加计算投票百分比的方法
  calculateVotePercentage(option) {
    const { poll } = this.data
    if (!poll || !poll.votes) {
      return '0%'
    }

    const votes = poll.votes
    const currentVotes = votes[option.index] || 0

    // 计算总票数
    const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0)

    if (totalVotes === 0) {
      return '0%'
    }

    return Math.round((currentVotes / totalVotes) * 100) + '%'
  },

  // 添加分享方法
  onShareAppMessage() {
    const { poll, pollId } = this.data
    return {
      title: poll ? poll.title : '邀请你参与投票',
      path: `/pages/detail/index?pollId=${pollId}`,
      imageUrl: '/images/share-default.png'
    }
  },

  // 添加新的方法来检查用户投票状态
  async checkUserVoteStatus(pollId) {
    try {
      const db = wx.cloud.database();
      const userInfo = await wx.cloud.callFunction({
        name: 'getUserVoteStatus',
        data: {
          pollId: pollId
        }
      });
      return userInfo.result;
    } catch (error) {
      console.error('获取用户投票状态失败：', error);
      return { hasVoted: false };
    }
  },

  onBackButtonTap() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1
      });
    } else {
      wx.reLaunch({
        url: '/pages/home/index' // 请确保此路径为首页路径
      });
    }
  },

  // 显示投票对话框
  showVoteDialog() {
    if (this.data.hasVoted) {
      wx.showToast({
        title: '您已经投过票了',
        icon: 'none'
      })
      return
    }
    if (this.data.isExpired) {
      wx.showToast({
        title: '投票已结束',
        icon: 'none'
      })
      return
    }
    this.setData({
      showVoteModal: true
    })
  },

  // 关闭投票对话框
  closeVoteDialog() {
    this.setData({
      showVoteModal: false,
      selectedOption: null
    })
  },

  // 选择投票选项
  selectOption(e) {
    const { originalIndex } = e.currentTarget.dataset
    this.setData({
      selectedOption: originalIndex
    })
  },

  // 确认投票
  async confirmVote() {
    if (this.data.selectedOption === null) {
      wx.showToast({
        title: '请选择一个选项',
        icon: 'none'
      })
      return
    }
    await this.submitVote({
      currentTarget: {
        dataset: {
          originalIndex: this.data.selectedOption
        }
      }
    })
    this.closeVoteDialog()
  },

  // 复制投票结果
  copyPollResult() {
    if (!this.data.poll) {
      wx.showToast({
        title: '暂无投票数据',
        icon: 'none'
      })
      return
    }

    const poll = this.data.poll
    let resultText = `标题：${poll.title}\n`
    
    if (poll.description) {
      resultText += `描述：${poll.description}\n`
    }

    // 计算总票数
    const totalVotes = poll.sortedOptions.reduce((sum, option) => sum + (option.votes || 0), 0)
    
    resultText += `\n总投票人数：${totalVotes}人\n\n投票选项：\n`
    
    poll.sortedOptions.forEach((option, index) => {
      const votes = option.votes || 0
      const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100)
      resultText += `${index + 1}. ${option.text}：${votes}票 (${percentage}%)\n`
    })

    wx.setClipboardData({
      data: resultText,
      success: () => {
        wx.showToast({
          title: '投票结果已复制',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'error'
        })
      }
    })
  },

  // 删除投票
  async deletePoll() {
    try {
      // 先获取用户的 openid
      if (!this.data.openid) {
        await this.getUserInfo()
      }

      // 获取投票详情
      const db = wx.cloud.database()
      const poll = await db.collection('polls').doc(this.data.pollId).get()
      
      // 检查是否是本人创建的投票
      if (poll.data._openid !== this.data.openid) {
        wx.showToast({
          title: '不是你创建的投票',
          icon: 'error'
        })
        return
      }
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除吗？此操作不可恢复。',
        success: async (res) => {
          if (res.confirm) {
            try {
              const result = await wx.cloud.callFunction({
                name: 'deletePoll',
                data: {
                  pollId: this.data.pollId
                }
              })
              
              if (result.result && result.result.success) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success',
                  success: () => {
                    setTimeout(() => {
                      wx.navigateBack()
                    }, 1500)
                  }
                })
              } else {
                wx.showToast({
                  title: result.result.error || '删除失败',
                  icon: 'error'
                })
              }
            } catch (error) {
              console.error('删除出错:', error)
              wx.showToast({
                title: '删除失败',
                icon: 'error'
              })
            }
          }
        }
      })
    } catch (error) {
      console.error('获取投票详情失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      })
    }
  },
})