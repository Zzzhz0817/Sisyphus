# Sisyphus 部署指南

## 项目架构

本项目维护 **一套源码，两个构建版本**：

| 版本 | 网址 | 入口方式 | 说明 |
|------|------|----------|------|
| 桌面版 | `zzzhz.games/si` | 浏览器直接访问 | 鼠标操作，左键推动，右键交替（需装备 Dual Push） |
| 手机版 | `zzzhz.games/si-m` | 二维码扫码访问 | 触摸操作，屏幕左右分区交替，强制横屏 |

两个版本通过 Vite 的 `define` 注入 `__MOBILE__` 常量区分，构建时 tree-shaking 会自动移除另一端的代码。

## 仓库位置

| 用途 | 本地路径 | 远程仓库 |
|------|----------|----------|
| 游戏源码 | `C:\Users\Hanzhe\Desktop\GSND6320\Sisyphus` | — |
| 网站部署 | `C:\Users\Hanzhe\Desktop\zzzhz.games\zzzhz-games` | `github.com/Zzzhz0817/zzzhz-games` (GitHub Pages) |

游戏源码仓库负责开发和版本管理，网站仓库只存放构建产物。

## 构建配置

- `vite.config.ts` — 桌面版，`base: '/si/'`，`__MOBILE__: false`，输出到 `dist/`
- `vite.mobile.config.ts` — 手机版，`base: '/si-m/'`，`__MOBILE__: true`，输出到 `dist-mobile/`

## 部署步骤

在 Sisyphus 项目目录下执行：

```bash
# 1. 构建两个版本
npm run build
npm run build:mobile

# 2. 清空旧文件并复制到网站目录
rm -rf ../zzzhz.games/zzzhz-games/si
rm -rf ../zzzhz.games/zzzhz-games/si-m
cp -r dist ../zzzhz.games/zzzhz-games/si
cp -r dist-mobile ../zzzhz.games/zzzhz-games/si-m

# 3. 提交并推送
cd ../zzzhz.games/zzzhz-games
git add si/ si-m/
git commit -m "Update Sisyphus builds"
git push
```

推送后 GitHub Pages 会在 1-2 分钟内自动部署。

## 桌面版与手机版的差异

| 功能 | 桌面版 | 手机版 |
|------|--------|--------|
| 核心操作 | `mousedown` / `mouseup` | `touchstart` / `touchend` |
| Dual Push | 鼠标左右键交替 | 屏幕左右两侧交替 |
| 屏幕方向 | 无限制 | 强制横屏（CSS 旋转 + Screen Orientation API） |
| UI 文本 | "按住左键"、"点击" | "按住屏幕"、"轻触" |
| HUD 颜色 | 金色（`#FFD740`） | 深蓝色（`#2962FF`） |
| 调试按键 | Space 键可用 | 无 |
