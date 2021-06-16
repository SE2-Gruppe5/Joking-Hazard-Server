import { RemoteSocket, Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Message, CallbackFn } from "../models/types";
import { getGames } from "./roomHandlers";

/**
 * Registers user handlers
 *
 * @export
 * @param {Server} io The Server object
 * @param {Socket} socket The socket that received a signal
 */
export function registerUserHandlers(io: Server, socket: Socket) {
  socket.on("user:name:change", (name: string, callback?: CallbackFn) =>
    changeName(socket, name, callback ?? (() => { }))
  );

  socket.on("user:data:get", (id: string, callback?: CallbackFn) =>
    getSocketById(io, id).then((socket) => {
      getUserData(socket, callback ?? (() => { }));
    })
  );

  socket.on(
    "user:points:set",
    (id: string, points: number, callback?: CallbackFn) =>
      getSocketById(io, id).then((socket) => {
        setPoints(io, socket, points, callback ?? (() => { }));
      })
  );
  socket.on(
    "user:points:add",
    (id: string, points: number, callback?: CallbackFn) =>
      getSocketById(io, id).then((socket) => {
        addPoints(io, socket, points, callback ?? (() => { }));
      })
  );
  socket.on("user:points:get", (id: string, callback?: CallbackFn) =>
    getSocketById(io, id).then((socket) => {
      getPoints(socket, callback ?? (() => { }));
    })
  );
}

/**
 * Called when the user sets their name
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {string} name The username to be set
 * @param {CallbackFn} [callback] The callback sent to the client
 */
export function changeName(socket: Socket, name: string, callback: CallbackFn) {
  socket.data.name = name;
  callback({
    status: "ok",
    msg: Message.user_changed_name,
    name: socket.data.name,
  });
}

/**
 * Sends the user data to the calling socket
 *
 * @param {Socket} socket The socket
 * @param {CallbackFn} [callback] The callback sent to the client
 */
export function getUserData(socket: Socket, callback: CallbackFn) {
  if (!socket) {
    callback({
      status: "err",
      msg: Message.user_doesnt_exist,
    });
  } else {
    callback({
      status: "ok",
      msg: Message.player_get_data,
      userData: socket.data,
    });
  }
}

/**
 * Set the points of the calling socket
 *
 * @param {Socket} socket The socket
 * @param {number} points The points to set for the socket
 * @param {CallbackFn} [callback] The callback sent to the client
 */
export function setPoints(
  io: Server,
  socket: Socket,
  points: number,
  callback: CallbackFn
) {
  if (!socket) {
    callback({
      status: "err",
      msg: Message.user_doesnt_exist,
    });
  } else if (socket.data.currentRoom) {
    socket.data.points = points;

    let roomCode = socket.data.currentRoom;
    let games = getGames();
    let game = games.get(roomCode);

    if (socket.data.point >= game.pointLimit) {
      io.in(roomCode).emit("room:gameOver", {
        winner: socket.data
      });
    }

    callback({
      status: "ok",
      msg: Message.user_set_points,
      points: socket.data.points,
    });


  } else {
    callback({
      status: "err",
      msg: Message.user_not_in_a_room,
    });
  }
}

/**
 * Add points to the calling socket
 *
 * @param {Socket} socket The socket
 * @param {number} points The points to set for the socket
 * @param {CallbackFn} [callback] The callback sent to the client
 */
export function addPoints(
  io: Server,
  socket: Socket,
  points: number,
  callback: CallbackFn
) {
  if (!socket) {
    callback({
      status: "err",
      msg: Message.user_doesnt_exist,
    });
  } else if (socket.data.currentRoom) {
    socket.data.points += points;

    let roomCode = socket.data.currentRoom;
    let games = getGames();
    let game = games.get(roomCode);

    if (socket.data.point >= game.pointLimit) {
      io.in(roomCode).emit("room:gameOver", {
        winner: socket.data
      });
    }

    callback({
      status: "ok",
      msg: Message.user_set_points,
      points: socket.data.points,
    });


  } else {
    callback({
      status: "err",
      msg: Message.user_not_in_a_room,
    });
  }
}

/**
 * Sends a message to the caller containing their points
 *
 * @param {Socket} socket The socket
 * @param {CallbackFn} [callback] The callback sent to the client
 */
export function getPoints(socket: Socket, callback: CallbackFn) {
  if (!socket) {
    callback({
      status: "err",
      msg: Message.user_doesnt_exist,
    });
  } else if (socket.data.currentRoom) {
    callback({
      status: "ok",
      msg: Message.user_set_points,
      points: socket.data.points,
    });
  } else {
    callback({
      status: "err",
      msg: Message.user_not_in_a_room,
    });
  }
}

/**
 * Returns a promise containing the socket object with the specified id
 *
 * @param {Server} io The server object
 * @param {string} id The id of the socket
 * @return {*}  {Promise<any>} Promise containing the socket
 */
export async function getSocketById(io: Server, id: string): Promise<any> {
  let sockets = await io.in(id).fetchSockets();

  if (sockets.length == 0) {
    return undefined;
  } else {
    return sockets[0];
  }
}
