import { Server, Socket } from "socket.io";
import { MessageType, Message, CallbackFn, GameObject } from "../models/types";
import { getSocketById } from "./userHandlers";
import { removeCardsMap, createCardsMap } from "./cardHandlers";

let games = new Map<string, GameObject>();

/**
 * Registers room handlers
 *
 * @export
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 */
export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on("room:create", ( timeLimit: number ,callback?: CallbackFn) =>
    createRoom(io, socket, timeLimit, callback ?? (() => {}))
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

  socket.on("room:players", (callback?: CallbackFn) =>
    getPlayers(io, socket, callback ?? (() => {}))
  );

  socket.on("room:currentPlayer:get", (callback?: CallbackFn) =>
    getCurrentPlayer(io, socket, callback ?? (() => {}))
  );

  socket.on("room:playerDone", (callback?: CallbackFn) =>
    playerDone(io, socket, callback ?? (() => {}))
  );

  socket.on("room:enteredGame", (callback?: CallbackFn) =>
    playerEnteredGame(io, socket, callback ?? (() => {}))
  );
}

/**
 * Called when a user creates a room
 * Sets the user's currentRoom and sets admin to true
 * It checks for empty rooms, and if it can't find any, sends an error to the client
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param timeLimit timeLimit per turn set by admin
 * @param {CallbackFn} callback The callback sent to the caller
 */
export function createRoom(
  io: Server,
  socket: Socket,
  timeLimit: number,
  callback?: CallbackFn
) {
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
      createCardsMap(room);
      games.set(room, {
        players: [],
        currentPlayer: 0,
        currentJudge: 0,
        playersLeft: 0,
        currentRound: 1,
        timeLimit
      });
      socket.join(room);
      socket.data.currentRoom = room;
      socket.data.admin = true;
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
export function joinRoom(
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
    socket.join(roomCode);
    socket.data.currentRoom = roomCode;
    socket.data.admin = false;
    io.in(roomCode).emit("room:player_joined");
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
export function leaveRoom(io: Server, socket: Socket, callback?: CallbackFn) {
  if (!socket.data.currentRoom) {
    callback({
      status: "err",
      msg: Message.user_not_in_a_room,
    });
  } else {
    let roomCode = socket.data.currentRoom;
    let game = games.get(roomCode);
    let playerArray = game.players;
    let playerIndex = playerArray.findIndex((el, index) => {
      if (el === socket.id) return index;
    });
    if (playerIndex <= game.currentPlayer) {
      game.currentPlayer -= 1;
    } else {
      game.playersLeft -= 1;
    }
    playerArray = playerArray.splice(playerIndex, 1);
    game.players = playerArray;

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
    if (io.sockets.adapter.rooms.get(roomCode)?.size === 0) {
      removeCardsMap(roomCode);
    }
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
export function closeRoom(io: Server, socket: Socket, callback?: CallbackFn) {
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
        removeCardsMap(room);
        callback({
          status: "ok",
          msg: Message.room_closed,
        });
      });
  }
}

/**
 * Returns an array of the players in the room
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {CallbackFn} [callback] The callback sent to the caller
 */
export function getPlayers(io: Server, socket: Socket, callback?: CallbackFn) {
  let roomCode = socket.data.currentRoom;
  if (!roomCode) {
    callback({
      status: "err",
      msg: Message.user_not_in_a_room,
    });
  } else {
    io.in(roomCode)
      .fetchSockets()
      .then((sockets) => {
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
      });
  }
}

/**
 * Finds empty rooms by going over every number from 0000 - 9999 and stops at the first free room
 *
 * @param {Server} io The Server Object
 * @return {*}  {(string | undefined)} The room id if one is available, undefined if not
 */
export function findEmptyRoom(io: Server): string | undefined {
  for (let i = 0; i < 1000; i++) {
    let roomCode = pad(i, 4);
    if (io.of("/").adapter.rooms.has(roomCode)) continue;
    else return roomCode;
  }
  return undefined;
}

/**
 * Returns the current Player
 *
 * @param {Server} io The server object
 * @param {string} socket The socket
 * @param {CallbackFn} [callback] The callback sent to the caller
 */
export function getCurrentPlayer(
  io: Server,
  socket: Socket,
  callback?: CallbackFn
) {
  let roomCode = socket.data.currentRoom;
  if (!io.of("/").adapter.rooms.has(roomCode)) {
    callback({
      status: "err",
      msg: Message.room_doesnt_exist,
    });
  } else {
    var currentPlayer =
      games.get(roomCode).players[games.get(roomCode).currentPlayer];
    callback({
      status: "ok",
      msg: Message.currentPlayer,
      currentPlayer: currentPlayer,
    });
  }
}

/**
 * Called when the player says that they're done
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {CallbackFn} [callback] The callback sent to the caller
 */
export function playerDone(io: Server, socket: Socket, callback?: CallbackFn) {
  let roomCode = socket.data.currentRoom;
  let game = games.get(roomCode);
  if (game.playersLeft === 0) {
    getJudge(io, socket).then((socket) => {
      socket.emit("room:all_cards_played");
    });

    game.playersLeft = game.players.length - 1;
    game.currentRound += 1;
    game.currentJudge += 1;
    game.currentPlayer = game.currentJudge;
    let currentPlayerId = game.players[game.currentPlayer];
    io.to(currentPlayerId).emit("room:your_turn", { judge: true });
  } else {
    game.currentPlayer =
      game.currentPlayer < game.players.length - 1 ? game.currentPlayer + 1 : 0;
    game.playersLeft -= 1;
    let currentPlayerId = game.players[game.currentPlayer];
    io.to(currentPlayerId).emit("room:your_turn", { judge: false });
  }
}

/**
 * Returns a promise containing the current judge
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 */
function getJudge(io: Server, socket: Socket): Promise<any> {
  let roomCode = socket.data.currentRoom;
  let game = games.get(roomCode);
  return getSocketById(io, game.players[game.currentJudge]);
}

/**
 * Called when a client enters the game
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {CallbackFn} [callback] The callback sent to the caller
 */
export function playerEnteredGame(
  io: Server,
  socket: Socket,
  callback: CallbackFn
): void {
  let roomCode = socket.data.currentRoom;
  let game = games.get(roomCode);
  game.players.push(socket.id);
  game.playersLeft += 1;
  io.in(roomCode)
    .fetchSockets()
    .then((sockets) => {
      if (socket.data.admin) {
        io.in(roomCode).emit("room:admin_started_game");
      }
      if (game.playersLeft === sockets.length) {
        game.playersLeft--;
        io.in(roomCode).emit("room:ready_to_play", {
          timeLimit: game.timeLimit
        });
        io.to(game.players[game.currentPlayer]).emit("room:your_turn", {
          judge: true,
        });
      }
    });
}

/**
 * Pads the number with zeroes
 *
 * @param {number} num The number
 * @param {number} size The length of the desired string
 * @return {*}  {string} The padded string
 */
export function pad(num: number, size: number): string {
  var s = "0000" + num;
  return s.substr(s.length - size);
}
