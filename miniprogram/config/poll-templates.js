export const pollTemplates = {
  templates: [
    {
      id: 'milktea',
      template: {
        title: '喝点什么吧',
        description: '一起来选择喝什么奶茶吧',
        options: [
          '喜茶',
          '奈雪的茶',
          '蜜雪冰城',
          '茶百道',
          'COCO都可',
          '一点点',
          '书亦烧仙草',
          '古茗'
        ],
        multiSelect: true
      }
    },
    {
      id: 'dinner',
      template: {
        title: '宵夜吃什么',
        description: '一起来选择吃什么吧',
        options: [
          '海底捞火锅',
          '外婆家',
          '韩式烤肉',
          '汉堡王',
          '真功夫',
          '肯德基',
          '麦当劳',
          '必胜客',
          '永和大王',
          '吉野家'
        ],
        multiSelect: false
      }
    },
    {
      id: 'teambuilding',
      template: {
        title: '团建玩什么',
        description: '选择一个有趣的团建活动吧',
        options: [
          '麻将',
          '你画我猜',
          '剧本杀',
          'KTV',
          '害你在心口难开',
          '三国杀',
          'LOL',
          'UNO'
        ],
        multiSelect: true
      }
    }
  ]
} 