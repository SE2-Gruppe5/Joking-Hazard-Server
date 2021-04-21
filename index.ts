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

httpServer.listen(3000, () => {
  console.log("Listening...");
});
