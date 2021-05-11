import { Server, Socket } from "socket.io";
import { MessageType, Message, CallbackFn } from "../models/types";

let games = {};

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on("room:create", (callback?: CallbackFn) =>
    createRoom(io, socket, callback ?? (() => {}))
  );

  socket.on("room:close", (callback?: CallbackFn) =>
    closeRoom(io, socket, callback ?? (() => {}))
  );

  socket.on("room:join", (roomCode: string, callback?: CallbackFn) =>
    joinRoom(io, socket, roomCode, callback ?? (() => {}))
  );

  socket.on("room:leave", (callback?: CallbackFn) =>
    leaveRoom(io, socket, callback ?? (() => {}))
  );

  socket.on("room:players", (roomCode: string, callback?: CallbackFn) =>
    getPlayers(io, roomCode, callback ?? (() => {}))
  );

  socket.on("room:currentPlayer:get", (roomCode: string, callback?: CallbackFn) =>
    getCurrentPlayer(io, roomCode, callback ?? (() => { }))
  );

  socket.on("room:playerDone", (roomCode: string, callback?: CallbackFn) =>
    playerDone(io, socket, roomCode, callback ?? (() => { }))
  );
}

/**
 * Called when a user creates a room
 * Sets the user's currentRoom and sets admin to true
 * It checks for empty rooms, and if it can't find any, sends an error to the client
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {CallbackFn} callback The callback sent to the caller
 */
function createRoom(io: Server, socket: Socket, callback?: CallbackFn) {
  if (socket.data.currentRoom) {
    callback({
      status: "err",
      msg: Message.already_in_room,
    });
  } else {
    let room = findEmptyRoom(io);
    if (!room) {
      callback({
        status: "err",
        msg: Message.no_free_room,
      });
    } else {
      games[room] = null;
      games[room] = { players: [socket.id], currentPlayer: 0, playersLeft: 0, currentRound: 1 };
      socket.join(room);
      socket.data.currentRoom = room;
      socket.data.admin = true;
      socket.data.judge = true;
      callback({
        status: "ok",
        msg: Message.room_created,
        roomCode: room,
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
 * @param {string} roomCode The room code
 * @param {CallbackFn} callback The callback sent to the caller
 */
function joinRoom(
  io: Server,
  socket: Socket,
  roomCode: string,
  callback?: CallbackFn
) {
  if (socket.data.currentRoom) {
    callback({
      status: "err",
      msg: Message.already_in_room,
    });
  } else if (!io.of("/").adapter.rooms.has(roomCode)) {
    callback({
      status: "err",
      msg: Message.room_doesnt_exist,
    });
  } else if (io.of("/").adapter.rooms.get(roomCode).size >= 4) {
    callback({
      status: "err",
      msg: Message.room_full,
    });
  } else {
    games[roomCode].players.push(socket.id);
    games[roomCode].playersLeft += 1;
    socket.join(roomCode);
    socket.data.currentRoom = roomCode;
    socket.data.admin = false;
    callback({
      status: "ok",
      msg: Message.room_joined,
      roomCode: roomCode,
    });
  }
}

/**
 * Called when the user leaves a room
 * Removes currentRoom and admin, and notifies others.
 * If the user was admin, the next person in the list is declared admin and is notified thereof.
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {CallbackFn} callback The callback sent to the caller
 */
function leaveRoom(io: Server, socket: Socket, callback?: CallbackFn) {
  if (!socket.data.currentRoom) {
    callback({
      status: "err",
      msg: Message.user_not_in_a_room,
    });
  } else {
    var playerArray = games[socket.data.currentRoom].players;
    var playerIndex = playerArray.findIndex(socket.id);
    if (playerIndex <= games[socket.data.currentRoom].currentPlayer) {
      games[socket.data.currentRoom].currentPlayer -= 1;
    } else {
      games[socket.data.currentRoom].playersLeft -= 1; 
    }
    playerArray = playerArray.splice(playerIndex, 1);
    games[socket.data.currentRoom].players = playerArray;

    socket.leave(socket.data.currentRoom);
    io.in(socket.data.currentRoom).emit(MessageType.INFO, {
      msg: Message.user_left_game,
      userId: socket.id,
      userName: socket.data.name,
    });
    if (socket.data.admin) {
      io.in(socket.data.currentRoom)
        .fetchSockets()
        .then((sockets) => {
          if (sockets.length !== 0) {
            sockets[0].data.admin = true;
            sockets[0].emit(MessageType.INFO, {
              msg: Message.user_became_admin,
              userId: sockets[0].id,
              userName: sockets[0].data.name,
            });
          }
        });
    }
    socket.data.currentRoom = undefined;
    socket.data.admin = undefined;
    callback({
      status: "ok",
      msg: Message.room_left,
    });
  }
}

/**
 * Called when a user closes a room
 * Sets every users current room and admin status to undefined
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {CallbackFn} callback The callback sent to the caller
 */
function closeRoom(io: Server, socket: Socket, callback?: CallbackFn) {
  if (!socket.data.admin) {
    callback({
      status: "err",
      msg: Message.user_not_an_admin,
    });
  } else if (!socket.data.currentRoom) {
    callback({
      status: "err",
      msg: Message.user_not_in_a_room,
    });
  } else {
    const room = socket.data.currentRoom;
    games[room] = null;
    io.in(room).emit(MessageType.INFO, {
      msg: Message.room_closed,
    });
    io.in(room)
      .fetchSockets()
      .then((sockets) => {
        sockets.forEach((socket) => {
          socket.data.currentRoom = undefined;
          socket.data.admin = undefined;
        });
        io.socketsLeave(room);
        callback({
          status: "ok",
          msg: Message.room_closed,
        });
      });
  }
}

/**
 *
 *
 * @param {Server} io The server object
 * @param {string} roomCode The room code
 * @param {CallbackFn} callback The callback sent to the caller
 */
function getPlayers(io: Server, roomCode: string, callback?: CallbackFn) {
  io.in(roomCode)
    .fetchSockets()
    .then((sockets) => {
      if (sockets.length <= 0) {
        callback({
          status: "err",
          msg: Message.room_doesnt_exist,
        });
      } else {
        let arr = new Array();
        sockets.forEach((socket) => {
          arr.push({
            id: socket.id,
            name: socket.data.name,
            points: socket.data.points,
          });
        });
        callback({
          status: "ok",
          msg: Message.all_players_get_data,
          users: arr,
        });
      }
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

/**
 *
 *
 * @param {Server} io The server object
 * @param {string} roomCode The room code
 * @param {CallbackFn} callback The callback sent to the caller
 */
 function getCurrentPlayer(io: Server, roomCode: string, callback?: CallbackFn) {
  if (!io.of("/").adapter.rooms.has(roomCode)) {
    callback({
      status: "err",
      msg: Message.room_doesnt_exist,
    });
  } else {
    var currentPlayer = games[roomCode].players[games[roomCode].currentPlayer];
    callback({
      status: 'ok',
      msg: Message.currentPlayer,
      currentPlayer: currentPlayer,
    })
  }
}

/**
 *
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {string} roomCode The room code
 * @param {CallbackFn} callback The callback sent to the caller
 */
function playerDone(io: Server, socket: Socket, roomCode: string, callback?: CallbackFn) {
  if (games[roomCode].playersLeft === 0) {
    let judge = getJudge(io,roomCode);
    //emit to judge socket and wait for response

    //after response
    games[roomCode].playersLeft = games[roomCode].players.length - 1;
    games[roomCode].currentPlayer = 0;
    games[roomCode].currentRound += 1;
    //set judge and edit Index
  } else {
    games[roomCode].currentPlayer += 1;
    games[roomCode].playersLeft -= 1;
    let currentPlayerId = games[roomCode].players[games[roomCode].currentPlayer];
    io.to(currentPlayerId).emit(MessageType.INFO, {
      msg: Message.user_is_current_player, });
  }
}


/**
 *
 *
 * @param {Server} io The server object
 * @param {string} roomCode The room code
 */
function getJudge(io:Server, roomCode: string) {
  io.in(roomCode)
  .fetchSockets()
  .then((sockets) => {
      sockets.forEach((socket) => {
        if (socket.data.judge === true) {
          return socket
        }
      });
    });
}