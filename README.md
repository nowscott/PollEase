# Pollease小程序

基于微信小程序平台的投票应用。

## 项目介绍

这是一个便捷的投票小程序，支持发起投票、参与投票，并实时查看投票结果。

## 主要功能

- 投票创建：支持多种投票形式
- 投票参与：简单便捷的投票流程
- 结果统计：实时查看投票数据
- 个人中心：管理个人发起和参与的投票
- 界面主题：支持明暗主题切换

## 项目结构

```
├── miniprogram/          # 小程序目录
    ├── components/       # 自定义组件
    ├── config/          # 配置文件
    ├── images/          # 静态资源
    ├── pages/           # 页面文件
    └── utils/           # 工具函数
```

## 开发环境

- 微信开发者工具
- Node.js环境

## 项目配置

在开始开发之前，您需要进行以下配置：

1. **复制配置文件**
   ```bash
   # 复制项目配置示例文件
   cp miniprogram/project.config.example.json miniprogram/project.config.json
   
   # 复制环境配置示例文件
   cp miniprogram/config.example.js miniprogram/config.js
   ```

2. **修改项目配置**
   - 打开 `project.config.json`
   - 将 `appid` 修改为您的小程序 AppID
   - 将 `projectname` 修改为您的项目名称

3. **配置云开发环境**
   - 打开 `config.js`
   - 将各环境的 `envId` 修改为您的云开发环境ID
   - 根据需要调整其他配置参数

4. **开发工具配置**
   - 打开微信开发者工具
   - 点击右上角"详情"
   - 勾选"使用npm模块"
   - 勾选"增强编译"
   - 在"本地设置"中配置云开发环境

## 开发说明

- 遵循微信小程序开发规范
- 使用WeUI组件库
- 采用模块化开发方式

## 参与贡献

如果您对本项目有任何建议或发现问题，欢迎提交 Issue 或 PR

## 版权说明

© 2024 保留所有权利
