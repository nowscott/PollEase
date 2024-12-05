const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('开始执行清理过期投票任务...')
  
  try {
    const now = Date.now()
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000) // 一周前的时间戳
    
    console.log('清理时间点:', {
      currentTime: new Date(now).toISOString(),
      clearBefore: new Date(oneWeekAgo).toISOString()
    })
    
    // 查询截止时间在一周前的投票
    const { data: expiredPolls } = await db.collection('polls')
      .where({
        endTime: db.command.lt(oneWeekAgo)
      })
      .get()
    
    console.log('查询到需要清理的投票数量:', expiredPolls ? expiredPolls.length : 0)
    
    // 如果没有需要清理的投票，直接返回
    if (!expiredPolls || expiredPolls.length === 0) {
      console.log('没有需要清理的过期投票')
      return {
        success: true,
        deleted: 0
      }
    }
    
    // 记录要删除的投票信息
    console.log('即将删除的投票:', expiredPolls.map(poll => ({
      id: poll._id,
      title: poll.title,
      endTime: new Date(poll.endTime).toISOString(),
      creator: poll._openid
    })))
    
    // 批量删除过期投票
    const deletePromises = expiredPolls.map(poll => 
      db.collection('polls').doc(poll._id).remove()
    )
    
    await Promise.all(deletePromises)
    
    const successMessage = `成功清理 ${expiredPolls.length} 个一周前截止的投票`
    console.log(successMessage)
    
    return {
      success: true,
      deleted: expiredPolls.length,
      clearedBefore: new Date(oneWeekAgo).toISOString(),
      details: {
        totalFound: expiredPolls.length,
        clearedPolls: expiredPolls.map(poll => ({
          id: poll._id,
          title: poll.title,
          endTime: new Date(poll.endTime).toISOString()
        }))
      }
    }
    
  } catch (error) {
    const errorMessage = '清理过期投票失败'
    console.error(errorMessage, {
      error: error.message,
      stack: error.stack
    })
    
    return {
      success: false,
      error: error.message,
      details: {
        errorTime: new Date().toISOString(),
        errorType: error.name,
        errorStack: error.stack
      }
    }
  } finally {
    console.log('清理过期投票任务执行完毕')
  }
} 