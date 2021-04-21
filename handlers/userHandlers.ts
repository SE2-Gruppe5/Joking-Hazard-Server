import { Server, Socket } from "socket.io";

export function registerUserHandlers(io: Server, socket: Socket) {
  socket.on("user:name", (name: string) => {
    console.log(
      (socket.data.name ?? socket.id) + " changed their name to " + name
    );
    socket.data.name = name;
  });

  socket.on(
    "room:points:set",
    (points: number) => (socket.data.points = points)
  );
  socket.on(
    "room:points:add",
    (points: number) => (socket.data.points += points)
  );
  socket.on(
    "room:points:remove",
    (points: number) => (socket.data.points -= points)
  );
}
