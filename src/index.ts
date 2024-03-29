/**
 * This module handles creating the server and registering the handlers for every socket connection
 * @module
 */

import { instrument } from "@socket.io/admin-ui";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { registerCardHandlers } from "./handlers/cardHandlers";
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
    password: "$2a$10$Hxq5.6TDLXeDn4MfdQbwm.kH8JNAp.RdxLgLRKRZCOZac2.MTBFvS",
  },
});

logger.debug("starting...");

io.on("connection", (socket: Socket) => {
  logger.debug(socket.id);
  registerRoomHandlers(io, socket);
  registerUserHandlers(io, socket);
  registerCardHandlers(io, socket);
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

httpServer.listen(process.env.PORT || 3000, () => {
  logger.debug(`listening on ${process.env.PORT || 3000}...`);
});
