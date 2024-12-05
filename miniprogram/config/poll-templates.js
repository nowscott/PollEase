export const pollTemplates = {
  templates: [
    {
      id: 'milktea',
      title: '奶茶选择',
      description: '一起来选择喝什么奶茶吧',
      template: {
        title: '奶茶投票',
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
      title: '晚饭选择',
      description: '一起来选择吃什么吧',
      template: {
        title: '晚饭投票',
        options: [
          '海底捞火锅',
          '外婆家',
          '绝味食尚',
          '西贝莜面村',
          '真功夫',
          '肯德基',
          '麦当劳',
          '必胜客',
          '永和大王',
          '吉野家'
        ],
        multiSelect: false
      }
    }
  ]
} 