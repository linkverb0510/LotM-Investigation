import { createServer } from "node:http";

import next from "next";
import { Server } from "socket.io";

import { registerSocketHandlers } from "@/lib/server/socket-events";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

async function bootstrap(): Promise<void> {
  await app.prepare();

  const httpServer = createServer((request, response) => {
    handle(request, response);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*"
    }
  });

  registerSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`Mystery Card Club server ready on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
