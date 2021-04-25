import { Server, Socket } from "socket.io";

export function registerRoomHandlers(io: Server, socket: Socket) {
  // Join a room
  socket.on("room:join", (roomCode: string) => {
    socket.join(roomCode);
  });

  // Leave a rooom
  socket.on("room:leave", (roomCode: string) => {
    socket.leave(roomCode);
  });

  // Get list of players in room
  socket.on("room:players:get", (roomCode) => {
    let arr = [];
    io.in(roomCode)
      .allSockets()
      .then((sockets) => {
        let arr = [];
        sockets.forEach((socket) => {
          arr.push(io.sockets.sockets.get(socket).data.name);
        });
        socket.emit("room:players", arr);
      });
  });

  // Kick everyone out of the room
  socket.on("room:close", (roomCode: string) => {
    io.socketsLeave(roomCode);
  });
}
