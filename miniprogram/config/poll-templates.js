export const pollTemplates = {
  templates: [
    {
      id: 'blank',
      template: {
        title: '',
        description: '',
        options: ['', ''],
        multiSelect: false
      }
    },
    {
      id: 'milktea',
      template: {
        title: '喝点什么呢',
        description: '一起选择喝什么吧',
        options: [
          '密雪冰城',
          '益和堂',
          '古茗',
          '茶百道',
          'COCO都可',
          '一点点',
          '邻里柠檬茶',
          '茶救星球'
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
          '肯德基',
          '汉堡王',
          '真功夫',
          '麦当劳',
          '必胜客',
          '烤肉',
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