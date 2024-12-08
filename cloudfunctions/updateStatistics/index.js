// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  const _ = db.command;
  const { type } = event; // 'vote' 或 'participant' 或 'init'

  try {
    // 更新计数
    const updateData = {};
    if (type === 'vote') {
      updateData.voteCount = _.inc(1);
    } else if (type === 'participant') {
      updateData.participantCount = _.inc(1);
    } else if (type === 'init') {
      // 初始化或获取统计数据
      try {
        const stats = await db.collection('statistics').doc('total').get();
        return { data: stats.data };
      } catch (err) {
        if (err.errCode === -1) {
          // 文档不存在，创建新文档
          await db.collection('statistics').add({
            data: {
              _id: 'total',
              voteCount: 0,
              participantCount: 0
            }
          });
          // 创建后重新获取
          const newStats = await db.collection('statistics').doc('total').get();
          return { data: newStats.data };
        }
        throw err;
      }
    }

    // 如果是更新操作
    if (Object.keys(updateData).length > 0) {
      try {
        await db.collection('statistics').doc('total').update({
          data: updateData
        });
        // 更新后返回最新数据
        const stats = await db.collection('statistics').doc('total').get();
        return { data: stats.data };
      } catch (err) {
        if (err.errCode === -1) {
          // 如果文档不存在，先创建
          await db.collection('statistics').add({
            data: {
              _id: 'total',
              voteCount: type === 'vote' ? 1 : 0,
              participantCount: type === 'participant' ? 1 : 0
            }
          });
          const stats = await db.collection('statistics').doc('total').get();
          return { data: stats.data };
        }
        throw err;
      }
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}
