import { Server, Socket } from "socket.io";
import { MessageType, Message } from "../models/enums";

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on("room:create", () => createRoom(io, socket));

  socket.on("room:close", () => closeRoom(io, socket));

  socket.on("room:join", (room) => joinRoom(io, socket, room));

  socket.on("room:leave", () => leaveRoom(io, socket));

  socket.on("room:players", (roomCode) => getPlayers(io, socket, roomCode));
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
  if (socket.data.currentRoom) {
    socket.emit(MessageType.ERROR, { msg: Message.already_in_room });
  } else {
    let room = findEmptyRoom(io);
    if (!room) {
      socket.emit(MessageType.ERROR, { msg: Message.no_free_room });
    } else {
      socket.join(room);
      socket.data.currentRoom = room;
      socket.data.admin = true;
      socket.emit(MessageType.INFO, {
        msg: Message.room_created,
        roomdId: room,
      });
    }
  }
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
  if (socket.data.currentRoom) {
    socket.emit(MessageType.ERROR, { msg: Message.already_in_room });
  } else if (!io.of("/").adapter.rooms.has(room)) {
    socket.emit(MessageType.ERROR, { msg: Message.room_doesnt_exist });
  } else if (io.of("/").adapter.rooms.get(room).size >= 4) {
    socket.emit(MessageType.ERROR, { msg: Message.room_full });
  } else {
    socket.join(room);
    socket.data.currentRoom = room;
    socket.data.admin = false;
    socket.emit(MessageType.INFO, { msg: Message.room_joined, roomId: room });
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
  if (!socket.data.currentRoom) {
    socket.emit(MessageType.ERROR, { msg: Message.user_not_in_a_room });
  } else {
    socket.leave(socket.data.currentRoom);
    io.in(socket.data.currentRoom).emit(MessageType.INFO, {
      msg: Message.user_left_game,
      userId: socket.id,
      userName: socket.data.name,
    });
    if (socket.data.admin) {
      io.of("/")
        .adapter.fetchSockets({ rooms: socket.data.currentRoom })
        .then((sockets) => {
          sockets[0].data.admin = true;
          sockets[0].emit(MessageType.INFO, {
            msg: Message.user_became_admin,
            userId: sockets[0].id,
            userName: sockets[0].data.name,
          });
        });
    }
    socket.data.currentRoom = undefined;
    socket.data.admin = undefined;
  }
}

/**
 * Called when a user closes a room
 * Sets every users current room and admin status to undefined
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 */
function closeRoom(io: Server, socket: Socket) {
  if (!socket.data.admin) {
    socket.emit(MessageType.ERROR, { msg: Message.user_not_an_admin });
  } else if (!socket.data.currentRoom) {
    socket.emit(MessageType.WARN, { msg: Message.user_not_in_a_room });
  } else {
    io.in(socket.data.currentRoom).emit(MessageType.INFO, {
      msg: Message.room_closed,
    });
    io.in(socket.data.currentRoom)
      .fetchSockets()
      .then((sockets) => {
        sockets[0].data.currentRoom = undefined;
        sockets[0].data.admin = undefined;
      });
  }
}

function getPlayers(io: Server, socket: Socket, roomId: string) {
  io.in(roomId)
    .fetchSockets()
    .then((sockets) => {
      let arr: Array<any>;
      sockets.forEach((socket) => {
        arr.push({
          id: socket.id,
          name: socket.data.name,
          points: socket.data.points,
        });
      });
      socket.emit(MessageType.INFO, {
        msg: Message.all_players_get_data,
        users: arr,
      });
    });
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
