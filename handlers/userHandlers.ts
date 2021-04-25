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

  socket.on("user:game:create", () => createRoom(io, socket));

  socket.on("user:game:join", (room) => joinRoom(io, socket, room));

  socket.on("user:game:leave", () => leaveRoom(io, socket));

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

/**
 * Called when a user creates a room
 * Sets the user's currentRoom and sets admin to true
 * It checks for empty rooms, and if it can't find any, sends an error to the client
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 */
function createRoom(io: Server, socket: Socket) {
  let room = findEmptyRoom(io);
  if (!room) {
    socket.emit("error:no_free_room");
  }
  socket.join(room);
  socket.data.currentRoom = room;
  socket.data.admin = true;
}

/**
 * Called when a user joins a room
 * Sets the users currentRoom and sets admin to false
 * If the room doesn't exist or the room is full it sends an error to the client
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 */
function joinRoom(io: Server, socket: Socket, room: string) {
  if (!io.of("/").adapter.rooms.has(room)) {
    socket.emit("error:room_doesnt_exist");
  } else if (io.of("/").adapter.rooms.get(room).size >= 4) {
    socket.emit("error:room_full");
  } else {
    socket.join(room);
    socket.data.currentRoom = room;
    socket.data.admin = false;
  }
}

/**
 * Called when the user leaves a room
 * Removes currentRoom and admin, and notifies others.
 * If the user was admin, the next person in the list is declared admin and is notified thereof.
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 */
function leaveRoom(io: Server, socket: Socket) {
  socket.leave(socket.data.currentRoom);
  io.in(socket.data.currentRoom).emit(
    "notify:user_left_game",
    socket.data.name
  );
  if (socket.data.admin) {
    io.of("/")
      .adapter.fetchSockets({ rooms: socket.data.currentRoom })
      .then((sockets) => {
        sockets[0].data.admin = true;
        sockets[0].emit("notify:became_admin");
      });
  }
  socket.data.currentRoom = undefined;
  socket.data.admin = undefined;
}

/**
 * Finds empty rooms by going over every number from 0000 - 9999 and stops at the first free room
 *
 * @param {Server} io The Server Object
 * @return {*}  {(string | undefined)} The room id if one is available, undefined if not
 */
function findEmptyRoom(io: Server): string | undefined {
  for (let i = 0; i < 1000; i++) {
    let roomCode = pad(i, 4);
    if (io.of("/").adapter.rooms.has(roomCode)) continue;
    else return roomCode;
  }
  return undefined;
}

/**
 * Pads the number with zeroes
 *
 * @param {number} num The number
 * @param {number} size The length of the desired string
 * @return {*}  {string} The padded string
 */
function pad(num: number, size: number): string {
  var s = "0000" + num;
  return s.substr(s.length - size);
}
