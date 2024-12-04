// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { pollId } = event
  const wxContext = cloud.getWXContext()
  
  try {
    // 确保只能删除自己创建的投票
    const poll = await db.collection('polls').doc(pollId).get()
    
    if (poll.data.creator !== wxContext.OPENID) {
      return {
        success: false,
        error: '没有权限删除此投票'
      }
    }
    
    // 删除投票
    await db.collection('polls').doc(pollId).remove()
    
    return {
      success: true
    }
  } catch (error) {
    console.error(error)
    return {
      success: false,
      error: error.message
    }
  }
}
