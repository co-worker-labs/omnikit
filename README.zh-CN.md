# OmniKit

一组基于浏览器的开发者在线工具集，使用 [Next.js](https://nextjs.org/) 构建。

[English](./README.md) | 简体中文

## 工具列表

| 工具               | 说明                                                                       |
| ------------------ | -------------------------------------------------------------------------- |
| JSON 格式化 / 压缩 | 格式化、压缩、校验 JSON/JSON5，可配置缩进                                  |
| Base64 编解码      | Base64 编码与解码，支持生成 Basic Auth 请求头                              |
| JWT                | 编码、解码、校验 JSON Web Token（HS/RS/ES/PS 256/384/512）                 |
| URL 编解码         | URL 编码与解码，支持组件、完整 URL、表单三种模式                           |
| UUID 生成器        | UUID v1/v3/v4/v5/v7 生成（RFC 4122/9562）                                  |
| 正则测试           | 正则表达式实时匹配测试，内置预设模式与解释模式                             |
| 二维码生成器       | 可自定义样式的二维码生成，支持 Logo 叠加、SVG/PNG 导出                     |
| 文本对比           | 并排或内联文本差异对比，支持单词级高亮，Web Worker 驱动                    |
| 文本哈希           | MD5、SHA-1/224/256/384/512、SHA3 系列、Keccak、RIPEMD-160                  |
| 密码生成器         | 安全、随机的可记忆密码生成                                                 |
| 文本大小写转换     | camelCase、PascalCase、snake_case、kebab-case 等多种格式互转               |
| 文本加解密         | AES、DES、Triple DES、Rabbit、RC4、RC4Drop                                 |
| Cron 表达式        | 构建 / 解析 Cron 表达式（标准、Spring、Quartz），预览下次执行时间          |
| Unix 时间戳        | Unix 时间戳与日期互转，实时时钟，支持秒 / 毫秒                             |
| Markdown 编辑器    | 实时预览，支持 GFM、语法高亮，可导出 PDF/PNG                               |
| 数据库查看器       | SQLite 数据库查看，内置 SQL 编辑器、自动补全、分页，可导出 CSV/JSON        |
| 文件校验           | 不限文件数量、不限文件大小的文件校验和                                     |
| 存储单位换算       | Byte、KB、MB、GB、TB、PB 等存储单位换算                                    |
| 颜色工具           | 颜色选择器，HEX/RGB/HSL/OKLCH 多格式转换，图片取色板，对比度检测，色觉模拟 |
| ASCII 表           | 完整 ASCII 参考，支持十六进制、八进制、HTML、十进制转换                    |
| HTML 实体          | HTML 特殊字符与实体参考                                                    |
| HTTP 状态码        | HTTP 状态码参考，支持分类浏览、搜索、规范链接                              |
| 进制转换           | BIN/OCT/DEC/HEX 进制转换，补码表示，位编辑器                               |
| CSV 转换器         | CSV ↔ JSON / Markdown 表格 / TSV 格式互转                                  |

所有操作均在浏览器中本地完成，不会向任何服务器发送数据。

## 技术栈

- **框架**：Next.js 16（App Router）
- **语言**：TypeScript
- **样式**：Tailwind CSS 4
- **国际化**：next-intl（English、简体中文、繁體中文）
- **加密**：CryptoJS、jose（JWT）
- **PWA**：Serwist（Service Worker）
- **编辑器**：CodeMirror 6（DB Viewer 中的 SQL 编辑器）
- **Markdown**：markdown-it、mermaid、PrismJS
- **数据库**：sql.js（浏览器端 SQLite）
- **文本对比**：diff（Web Worker 驱动）
- **颜色**：colord、react-colorful、colorthief
- **二维码**：qr-code-styling
- **CSV**：papaparse
- **搜索**：fuzzysort（工具模糊搜索）
- **截图**：modern-screenshot（Markdown 导出 PDF/PNG）
- **分析**：@vercel/analytics、@vercel/speed-insights
- **UI 组件**：Headless UI、Lucide Icons、rc-slider、@tanstack/react-virtual

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 脚本

| 命令                     | 说明                               |
| ------------------------ | ---------------------------------- |
| `npm run dev`            | 启动开发服务器                     |
| `npm run build`          | 生产构建                           |
| `npm run start`          | 启动生产服务器                     |
| `npm run prepare`        | 安装 Git 钩子（Husky）             |
| `npm run test`           | 运行测试（Vitest）                 |
| `npm run test:watch`     | 监听模式运行测试                   |
| `npm run icons:generate` | 从源图生成 PWA 图标                |
| `npm run typecheck:sw`   | 对 Service Worker 代码进行类型检查 |

## 项目结构

```
app/[locale]/       # 页面（每个工具一个目录）
  json/             # JSON 格式化 / 压缩
  base64/           # Base64 编解码
  jwt/              # JWT 调试
  urlencoder/       # URL 编解码
  uuid/             # UUID 生成器
  regex/            # 正则测试
  qrcode/           # 二维码生成器
  diff/             # 文本对比
  hashing/          # 文本哈希
  password/         # 密码生成器
  textcase/         # 文本大小写转换
  cipher/           # 文本加解密
  cron/             # Cron 表达式构建
  unixtime/         # Unix 时间戳转换
  markdown/         # Markdown 编辑器与预览
  dbviewer/         # SQLite 数据库查看器
  checksum/         # 文件校验
  storageunit/      # 存储单位换算
  color/            # 颜色工具
  ascii/            # ASCII 表
  htmlcode/         # HTML 实体参考
  httpstatus/       # HTTP 状态码
  numbase/          # 进制转换
  csv/              # CSV 转换器
app/serwist/        # Serwist PWA 运行时缓存路由
components/         # 共享 UI 组件
  ui/               # 可复用基础组件（Button、Card、Tabs 等）
  color/            # 颜色专用组件（ColorPicker 等）
hooks/              # 自定义 React Hooks
libs/               # 业务逻辑（按工具分子目录）
utils/              # 纯工具函数
i18n/               # 国际化配置与路由
styles/             # 全局样式（PrismJS 主题）
scripts/            # 构建与生成脚本
public/locales/     # 翻译文件（en、zh-CN、zh-TW）
```

## 国际化

支持三种语言：

- `en` — English（默认）
- `zh-CN` — 简体中文
- `zh-TW` — 繁體中文

语言前缀策略为 `as-needed` — 默认语言在 URL 中不带前缀。
