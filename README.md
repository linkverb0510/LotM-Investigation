# Mystery Card Club

一个以《诡秘之主》氛围为灵感的朋友局多人在线网页卡牌游戏 MVP。

## 文档入口

- [项目总规划](docs/项目总规划.md)
- [本轮开发计划](docs/本轮开发计划.md)

## 技术栈

- Next.js
- TypeScript
- Socket.IO
- Prisma
- PostgreSQL
- Docker

## 本地启动

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

访问 `http://localhost:3000`。
