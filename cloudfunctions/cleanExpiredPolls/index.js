const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('开始执行清理过期投票任务')
  
  try {
    const now = Date.now()
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000)
    
    // 查询截止时间在一周前的投票
    const { data: expiredPolls } = await db.collection('polls')
      .where({
        endTime: db.command.lt(oneWeekAgo)
      })
      .get()
    
    // 如果没有需要清理的投票，直接返回
    if (!expiredPolls || expiredPolls.length === 0) {
      console.log('没有需要清理的过期投票')
      return {
        success: true,
        deleted: 0
      }
    }
    
    // 批量删除过期投票
    const deletePromises = expiredPolls.map(poll => 
      db.collection('polls').doc(poll._id).remove()
    )
    
    await Promise.all(deletePromises)
    
    console.log(`成功清理 ${expiredPolls.length} 个过期投票`)
    
    return {
      success: true,
      deleted: expiredPolls.length,
      clearedBefore: new Date(oneWeekAgo).toISOString()
    }
    
  } catch (error) {
    console.error('清理过期投票失败:', error)
    
    return {
      success: false,
      error: error.message
    }
  }
} 