import { Server, Socket } from "socket.io";
import { Message, CallbackFn } from "../models/types";

/**
 * Registers user handlers
 *
 * @export
 * @param {Server} io The Server object
 * @param {Socket} socket The socket that received a signal
 */
export function registerUserHandlers(io: Server, socket: Socket) {
  socket.on("user:name:change", (name: string, callback: CallbackFn) =>
    changeName(socket, name, callback)
  );

  socket.on("user:data:get", (id: string, callback: CallbackFn) =>
    getUserData(io, id, callback)
  );

  socket.on("user:points:set", (points: number, callback: CallbackFn) =>
    setPoints(socket, points, callback)
  );
  socket.on("user:points:add", (points: number, callback: CallbackFn) =>
    addPoints(socket, points, callback)
  );
  socket.on("user:points:get", (callback: CallbackFn) =>
    getPoints(socket, callback)
  );
}

/**
 * Called when the user sets their name
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {string} name The username to be set
 */
function changeName(socket: Socket, name: string, callback: CallbackFn) {
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
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {string} id The user id to retrieve
 */
function getUserData(io: Server, id: string, callback: CallbackFn) {
  io.in(id)
    .fetchSockets()
    .then((sockets) => {
      if (sockets.length <= 0) {
        callback({
          status: "err",
          msg: Message.user_doesnt_exist,
        });
      } else {
        callback({
          status: "ok",
          msg: Message.player_get_data,
          userData: sockets[0].data,
        });
      }
    });
}

/**
 * Set the points of the calling socket
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {number} points The points to set for the socket
 */
function setPoints(socket: Socket, points: number, callback: CallbackFn) {
  if (socket.data.currentRoom) {
    socket.data.points = points;
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
 * Set the points of the calling socket
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {number} points The points to set for the socket
 */
function addPoints(socket: Socket, points: number, callback: CallbackFn) {
  if (socket.data.currentRoom) {
    socket.data.points += points;
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
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 */
function getPoints(socket: Socket, callback: CallbackFn) {
  if (socket.data.currentRoom) {
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
