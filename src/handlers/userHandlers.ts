import { Server, Socket } from "socket.io";

/**
 * Registers user handlers
 *
 * @export
 * @param {Server} io The Server object
 * @param {Socket} socket The socket that received a signal
 */
export function registerUserHandlers(io: Server, socket: Socket) {
  socket.on("user:name:change", (name: string) => changeName(io, socket, name));

  socket.on("user:data:get", (id: string) => getUser(io, socket, id));

  socket.on(
    "user:points:set",
    (points: number) => (socket.data.points = points)
  );
  socket.on(
    "user:points:add",
    (points: number) => (socket.data.points += points)
  );
  socket.on(
    "user:points:remove",
    (points: number) => (socket.data.points -= points)
  );
}

/**
 * Called when the user sets their name
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {string} name The username to be set
 */
function changeName(io: Server, socket: Socket, name: string) {
  socket.data.name = name;
}

async function getUser(io: Server, socket: Socket, id: string) {
  io.in(id)
    .fetchSockets()
    .then((sockets) => {
      socket.emit("response:get_user_data", sockets[0].data);
    });
}
