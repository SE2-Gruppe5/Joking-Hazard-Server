import { instrument } from "@socket.io/admin-ui";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { registerRoomHandlers } from "./handlers/roomHandlers";
import { registerUserHandlers } from "./handlers/userHandlers";
import { logger } from "./utils/Logger";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
  },
});

instrument(io, {
  auth: {
    type: "basic",
    username: "admin",
    password: "$2y$12$64WTig8qC13.w1l9xK.oUe5HbUd0WkcgpGuX2j6dUwNLLgKIuzKsa",
  },
});

logger.debug("starting...");

io.on("connection", (socket: Socket) => {
  logger.debug(socket.id);
  registerRoomHandlers(io, socket);
  registerUserHandlers(io, socket);
  socket.onAny(logSocketEvent);
});

io.of("/").adapter.on("create-room", (room) => {
  logger.debug(`room ${room} was created`);
});

io.of("/").adapter.on("delete-room", (room) => {
  logger.debug(`room ${room} was deleted`);
});

io.of("/").adapter.on("join-room", (room, id) => {
  logger.debug(`socket ${id} has joined room ${room}`);
});

io.of("/").adapter.on("leave-room", (room, id) => {
  logger.debug(`socket ${id} has left room ${room}`);
});

function logSocketEvent(...args: any[]) {
  logger.debug({ eventType: "socketEvent", event: args[0], args });
}

httpServer.listen(3000, () => {
  logger.debug("listening...");
});
