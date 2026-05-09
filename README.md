# Kaoshi - 考试计时器

基于 GitHub + Cloudflare Pages 的静态考试计时网站，支持多种考试类型配置、实时倒计时、进度条显示。

## 部署

1. 将代码推送到 GitHub 仓库
2. 在 Cloudflare Pages 中连接该仓库
3. 构建命令留空，输出目录设为 `/`

## 使用方式

| 访问方式 | 说明 |
|---------|------|
| `site.com` | 加载默认配置（代码中 `DEFAULT_CONFIG_URL`） |
| `site.com/?config=URL` | 加载指定远程 JSON 配置 |
| `site.com/setting` | 打开设置页面，配置本地 JSON / 背景 / 主题 |

配置加载优先级：URL 参数 > localStorage 本地配置 > 默认配置

---

## JSON 配置文件说明

### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 否 | 页面标题，显示在页面顶部和浏览器标签页 |
| `backgrounds` | string[] | 否 | 背景图片 URL 数组，页面加载时随机选取一张 |
| `background` | string | 否 | 单张背景图 URL（如果没有 `backgrounds` 则使用此字段） |
| `backgroundBlur` | number | 否 | 背景图模糊程度（单位 px），`0` 或不填表示不模糊 |
| `theme` | string | 否 | 默认主题，可选值：`"light"` / `"dark"` |
| `exams` | array | **是** | 考试列表 |

### exams 数组中的每个考试对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | **是** | 考试名称，如 "高三模拟考试" |
| `subjects` | array | **是** | 该考试包含的科目列表 |

### subjects 数组中的每个科目对象

每个科目必须包含 `name`、`type`、`startTime`、`endTime`，其余字段根据 `type` 不同而不同。

#### 通用字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | **是** | 科目名称，如 "数学"、"英语听力" |
| `type` | string | **是** | 时间类型，可选值见下方 |
| `startTime` | string | **是** | 开始时间，格式 `"HH:mm"`（24小时制），如 `"09:00"` |
| `endTime` | string | **是** | 结束时间，格式 `"HH:mm"`（24小时制），如 `"11:30"` |

#### type = "fixed"（固定日期）

一次性考试，在指定日期的指定时间段进行。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | **是** | 考试日期，格式 `"YYYY-MM-DD"`，如 `"2026-06-07"` |

```json
{
  "name": "数学",
  "type": "fixed",
  "date": "2026-06-07",
  "startTime": "09:00",
  "endTime": "11:30"
}
```

#### type = "weekly"（每周循环）

每周固定某天重复的考试/训练。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `dayOfWeek` | number | **是** | 星期几，`0`=周日, `1`=周一, `2`=周二 ... `6`=周六 |
| `validFrom` | string | 否 | 生效起始日期 `"YYYY-MM-DD"`，在此日期之前不显示 |
| `validUntil` | string | 否 | 生效截止日期 `"YYYY-MM-DD"`，在此日期之后不显示 |

```json
{
  "name": "听力测试",
  "type": "weekly",
  "dayOfWeek": 1,
  "startTime": "08:00",
  "endTime": "08:30",
  "validFrom": "2026-03-01",
  "validUntil": "2026-06-30"
}
```

#### type = "recurring"（自定义循环）

按固定间隔重复的考试。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `startDate` | string | **是** | 循环起始日期 `"YYYY-MM-DD"` |
| `endDate` | string | **是** | 循环截止日期 `"YYYY-MM-DD"` |
| `interval` | string | **是** | 循环间隔，可选值：`"daily"` / `"weekly"` / `"biweekly"` / `"monthly"` |
| `dayOfWeek` | number | **是** | 星期几（同 weekly） |

```json
{
  "name": "实验操作考核",
  "type": "recurring",
  "startDate": "2026-03-01",
  "endDate": "2026-06-01",
  "interval": "biweekly",
  "dayOfWeek": 4,
  "startTime": "14:00",
  "endTime": "16:00"
}
```

---

## 完整示例

```json
{
  "title": "2026年期末考试",
  "backgrounds": [
    "https://example.com/bg1.jpg",
    "https://example.com/bg2.jpg",
    "https://example.com/bg3.jpg"
  ],
  "backgroundBlur": 6,
  "theme": "dark",
  "exams": [
    {
      "name": "期末考试",
      "subjects": [
        {
          "name": "语文",
          "type": "fixed",
          "date": "2026-06-07",
          "startTime": "09:00",
          "endTime": "11:30"
        },
        {
          "name": "数学",
          "type": "fixed",
          "date": "2026-06-07",
          "startTime": "15:00",
          "endTime": "17:00"
        }
      ]
    },
    {
      "name": "每周训练",
      "subjects": [
        {
          "name": "英语听力",
          "type": "weekly",
          "dayOfWeek": 1,
          "startTime": "08:00",
          "endTime": "08:30",
          "validFrom": "2026-03-01",
          "validUntil": "2026-06-30"
        }
      ]
    }
  ]
}
```

---

## interval 可选值说明

| 值 | 含义 |
|----|------|
| `"daily"` | 每天 |
| `"weekly"` | 每周 |
| `"biweekly"` | 每两周 |
| `"monthly"` | 每月（约30天） |

## dayOfWeek 值对照

| 值 | 星期 |
|----|------|
| 0 | 周日 |
| 1 | 周一 |
| 2 | 周二 |
| 3 | 周三 |
| 4 | 周四 |
| 5 | 周五 |
| 6 | 周六 |
