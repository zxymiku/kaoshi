# Kaoshi - 考试计时器

基于原生 HTML/JS + 现代 CSS（毛玻璃/高斯模糊拟态设计）打造的高颜值静态考试计时网站。支持多种复杂的考试类型配置、实时倒计时、进度条显示，并集成了**全自动的短链跨库同步系统**。非常适合部署在 Cloudflare Pages、GitHub Pages 等静态托管服务上。

---

## ✨ 核心特性

- **极致现代 UI**：采用最新的 Glassmorphism（玻璃拟态）设计理念，支持亮色/暗色模式自适应。
- **动态背景切换**：内置悬浮式精美背景切换器，支持滚轮/触屏滑动切换，智能记忆用户当前会话状态。
- **可视化控制台**：自带 `/setting` 后台界面，无需手写代码即可视化配置考试类型、科目时间、修改背景与主题，并支持配置**3天智能缓存**。
- **强大的时间引擎**：支持一次性固定日期考试、每周循环测试、双周/月度自定义循环测试的倒计时。
- **GitHub 自动化跨库同步**：提供内置工作流，当你在 `img/` 目录下新增背景图时，可自动重命名、发版上传，并**将真实的下载代理链接智能同步至你的短链服务独立仓库中**。

---

## 🚀 部署指南

### 1. 基础部署 (Cloudflare Pages)

1. 将本代码仓库 Fork / Clone 并推送到你的 GitHub。
2. 登录 Cloudflare Pages，点击创建新项目并连接该仓库。
3. 构建命令留空，构建输出目录设为 `/`（根目录）。
4. 部署即可立刻使用！

### 2. 配置高级工作流 (自动同步短链)

本项目内置了能够跨仓库自动更新你的短链服务（如 `zxymiku/shortlink`）的 GitHub Actions。为了使此同步生效，请完成以下配置：

1. 打开 GitHub 右上角头像 -> **Settings** -> **Developer settings** -> **Personal access tokens (classic)**。
2. 生成一个新 Token，勾选 `repo` 权限。
3. 回到本项目的 **Settings** -> **Secrets and variables** -> **Actions**。
4. 点击 **New repository secret**，名称填写 `PAT_TOKEN`，值为刚才复制的 Token。
5. *现在，每当你向 `img/` 文件夹上传新图片并 push 后，工作流会自动重命名并同步链接至你独立的短链项目中！*

---

## 📖 使用方式与访问说明

| 访问路由 | 功能说明 |
|---------|------|
| `你的域名/` | 默认加载主页，读取内部配置的远程 `kaoshi.json` |
| `你的域名/?config=URL` | 强制加载指定的远程 JSON 配置文件 |
| `你的域名/setting` | 访问**可视化后台控制台**。在这里可以零代码修改考试时间，应用后自动生效 |

*(提示：您在 `/setting` 中保存的配置优先级最高，此本地缓存有效期为 3 天。过期后系统会自动回滚并拉取最新的远程配置文件。)*

---

## ⚙️ 配置文件 (kaoshi.json) 详解

你可以直接使用项目中自带的 `kaoshi.json` 模板，或在 `/setting` 中通过图形界面配置。

### 顶层结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 否 | 页面标题，显示在主页顶部和浏览器标签页 |
| `backgrounds` | string[] | 否 | 你的短链服务背景图 URL 数组，系统加载时将随机挑选一张 |
| `backgroundBlur` | number | 否 | 背景图毛玻璃模糊强度（单位 px，推荐 0~6） |
| `theme` | string | 否 | 默认色彩主题，可选值：`"light"` / `"dark"` / 不填（跟随系统） |
| `exams` | array | **是** | 核心考试数据列表 |

### exams 数组 (考试大类)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | **是** | 考试或训练大类名称，如 "模拟考试" |
| `subjects` | array | **是** | 该类目下包含的具体科目列表 |

### subjects 数组 (具体科目规则)

每个科目都包含名称和起止时间。根据 `type` 不同，定义日期的字段也有所不同。通用字段如下：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | **是** | 科目名称，如 "数学" |
| `type` | string | **是** | 时间规则类型，支持 `"fixed"`(固定), `"weekly"`(每周), `"recurring"`(循环) |
| `startTime` | string | **是** | 开始时间，严格要求 `"HH:mm"`（24小时制），如 `"09:00"` |
| `endTime` | string | **是** | 结束时间，严格要求 `"HH:mm"`，如 `"11:30"` |

#### 1. type = "weekly"（每周循环 - 常用）

适用于每周一到周五固定重复的测验/晚自习。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `dayOfWeek` | number | **是** | 星期几：`0`=周日, `1`=周一 ... `6`=周六 |
| `validFrom` | string | 否 | 该规则生效起始日期 `"YYYY-MM-DD"` |
| `validUntil` | string | 否 | 该规则失效日期 `"YYYY-MM-DD"` |

#### 2. type = "fixed"（固定日期一次性）

适用于期中、期末、大考等只发生一次的考试。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | **是** | 考试具体日期，格式 `"YYYY-MM-DD"`，如 `"2026-06-07"` |

#### 3. type = "recurring"（周期性循环）

适用于如“每两周”、“每月”举行一次的周期性测验。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `startDate` | string | **是** | 循环周期起始日期 |
| `endDate` | string | **是** | 循环周期截止日期 |
| `interval` | string | **是** | `"daily"`(每日), `"weekly"`(每周), `"biweekly"`(双周), `"monthly"`(每月) |
| `dayOfWeek` | number | **是** | 星期几 |

---

## 📝 完整 JSON 配置示例

```json
{
  "title": "高考冲刺倒计时",
  "backgrounds": [
    "https://shortlink.zxymiku.top/img/01",
    "https://shortlink.zxymiku.top/img/02",
    "https://shortlink.zxymiku.top/img/03"
  ],
  "backgroundBlur": 0,
  "theme": "light",
  "exams": [
    {
      "name": "高三一模",
      "subjects": [
        {
          "name": "语文",
          "type": "fixed",
          "date": "2026-03-15",
          "startTime": "09:00",
          "endTime": "11:30"
        }
      ]
    },
    {
      "name": "晚自习测验",
      "subjects": [
        {
          "name": "数学专练",
          "type": "weekly",
          "dayOfWeek": 1,
          "startTime": "19:00",
          "endTime": "21:00",
          "validFrom": "2026-01-01",
          "validUntil": "2026-06-01"
        }
      ]
    }
  ]
}
```

---

*Enjoy coding and good luck with your exams!*
