import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { registerRoomHandlers } from "./handlers/roomHandler";
import { registerUserHandlers } from "./handlers/userHandlers";

const httpServer = createServer();
const io = new Server(httpServer);

console.log("starting...");

io.on("connection", (socket: Socket) => {
  console.log(socket.id);
  registerRoomHandlers(io, socket);
  registerUserHandlers(io, socket);
});

io.of("/").adapter.on("create-room", (room) => {
  console.log(`room ${room} was created`);
});

io.of("/").adapter.on("delete-room", (room) => {
  console.log(`room ${room} was deleted`);
});

io.of("/").adapter.on("join-room", (room, id) => {
  console.log(`socket ${id} has joined room ${room}`);
});

io.of("/").adapter.on("leave-room", (room, id) => {
  console.log(`socket ${id} has left room ${room}`);
});

httpServer.listen(3000, () => {
  console.log("Listening...");
});
