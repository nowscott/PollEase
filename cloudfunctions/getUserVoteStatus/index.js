const cloud = require('wx-server-sdk');
cloud.init();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  
  try {
    // 从 polls 集合中查询该投票的 voters 字段
    const poll = await db.collection('polls')
      .doc(event.pollId)
      .get();
    
    if (!poll.data || !poll.data.voters) {
      return {
        hasVoted: false
      };
    }

    // 检查当前用户是否在 voters 列表中
    const hasVoted = poll.data.voters.some(voter => {
      if (typeof voter === 'string') {
        return voter === wxContext.OPENID;
      }
      return voter && voter.openid === wxContext.OPENID;
    });

    return {
      hasVoted: hasVoted
    };
  } catch (error) {
    console.error('查询投票记录失败：', error);
    return {
      hasVoted: false
    };
  }
} 