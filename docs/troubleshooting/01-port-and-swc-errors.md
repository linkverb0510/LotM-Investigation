# 故障排除：端口占用与 SWC 加载错误

> **日期**: 2026-05-14  
> **问题**: `EADDRINUSE` (端口占用) 和 `@next/swc ... not a valid Win32 application`

---

## 1. 错误原因分析

1.  **端口占用 (`EADDRINUSE: address already in use :::3000`)**
    *   之前的 `npm run dev` 进程没有正确关闭，仍在后台运行并占用 3000 端口。
2.  **SWC 报错 (`not a valid Win32 application`)**
    *   **依赖损坏**：`node_modules` 中的二进制文件下载不完整或已损坏（文件大小为 0）。
    *   **环境不匹配**：你在 WSL (Linux 环境) 中安装了依赖，却在 Windows 终端运行；或者反之。Next.js 需要针对当前运行环境下载特定的编译包。

---

## 2. 解决方案

请按顺序执行以下步骤，**确保在你运行游戏的同一个终端窗口中执行**。

### 步骤 1：清理旧进程
杀掉占用 3000 端口的进程。
```bash
npx kill-port 3000
```

### 步骤 2：清理缓存与依赖 (关键)
删除缓存文件夹和依赖包，强制重新下载正确的版本。
```bash
rm -rf .next node_modules
```
*(如果是 Windows CMD，请使用：`rmdir /s /q .next` 和 `rmdir /s /q node_modules`)*

### 步骤 3：重新安装依赖
重新安装，确保 SWC 二进制文件与当前系统匹配。
```bash
npm install
```
*(注意：观察控制台输出，确保没有大量红色报错)*

### 步骤 4：重启项目
```bash
npm run dev
```

---

## 3. 长期建议：将项目移入 WSL 原生目录

你当前项目位于 Windows 桌面 (`/mnt/c/Users/...`)。
在 WSL 环境下访问 `/mnt/c/` 目录下的项目会导致：
1.  **性能极低**：文件读写速度慢（Next.js 启动会变很慢）。
2.  **环境混乱**：容易出现上述的 SWC 报错或文件监听失效。

**建议操作**：
将项目移动到 WSL 的原生文件系统（如 `/home/klienfool_2006/`）中开发：
```bash
# 在 WSL 终端执行
cp -r /mnt/c/Users/李世旺/Desktop/Temp/Secret1 ~/Secret1
cd ~/Secret1
rm -rf node_modules .next
npm install
npm run dev
```
这样可以彻底解决此类兼容性问题。

---
*本文档创建于 2026-05-14*
