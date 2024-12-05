const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { pollId, optionIndex } = event
  
  try {
    // 获取投票详情
    const poll = await db.collection('polls').doc(pollId).get()
    if (!poll.data) {
      return {
        error: '投票不存在'
      }
    }

    // 检查是否已投票
    const voters = poll.data.voters || []
    const hasVoted = voters.some(voter => 
      voter === wxContext.OPENID || 
      (voter && voter.openid === wxContext.OPENID)
    )
    
    if (hasVoted) {
      return {
        error: '您已经投过票了'
      }
    }

    // 更新投票数据
    const votes = poll.data.votes || {}
    votes[optionIndex] = (votes[optionIndex] || 0) + 1

    // 更新数据库，存储完整的投票信息
    await db.collection('polls').doc(pollId).update({
      data: {
        votes: votes,
        voters: db.command.push([{
          openid: wxContext.OPENID,
          voteTime: db.serverDate(),
          optionIndex: optionIndex
        }])
      }
    })

    return {
      success: true,
      votes: votes
    }
  } catch (err) {
    console.error(err)
    return {
      error: '投票失败，请重试'
    }
  }
} 