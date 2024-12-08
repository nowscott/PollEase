// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { pollId } = event
  const wxContext = cloud.getWXContext()
  
  console.log('开始删除投票，pollId:', pollId)
  console.log('当前用户 OPENID:', wxContext.OPENID)
  
  try {
    // 确保只能删除自己创建的投票
    console.log('获取投票信息...')
    const poll = await db.collection('polls').doc(pollId).get()
    console.log('投票信息:', JSON.stringify(poll.data))
    console.log('对比权限 - 创建者:', poll.data.creatorId, '当前用户:', wxContext.OPENID)
    
    if (!poll.data) {
      console.log('投票不存在')
      return {
        success: false,
        error: '投票不存在'
      }
    }

    if (poll.data.creatorId !== wxContext.OPENID) {
      console.log('没有权限，创建者:', poll.data.creatorId)
      return {
        success: false,
        error: '没有权限删除此投票',
        creator: poll.data.creatorId,
        currentUser: wxContext.OPENID
      }
    }
    
    // 删除投票
    console.log('开始删除投票...')
    const result = await db.collection('polls').doc(pollId).remove()
    console.log('删除结果:', result)
    
    return {
      success: true,
      result: result
    }
  } catch (error) {
    console.error('删除失败:', error)
    return {
      success: false,
      error: error.message || '删除失败'
    }
  }
}
