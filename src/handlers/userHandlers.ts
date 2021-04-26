import { Server, Socket } from "socket.io";
import { MessageType, Message } from "../models/enums";

/**
 * Registers user handlers
 *
 * @export
 * @param {Server} io The Server object
 * @param {Socket} socket The socket that received a signal
 */
export function registerUserHandlers(io: Server, socket: Socket) {
  socket.on("user:name:change", (name) => changeName(io, socket, name));

  socket.on("user:data:get", (id) => getUserData(io, socket, id));

  socket.on("user:points:set", (points) => setPoints(io, socket, points));
  socket.on("user:points:get", () => getPoints(io, socket));
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
  socket.emit(MessageType.INFO, {
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
function getUserData(io: Server, socket: Socket, id: string) {
  io.in(id)
    .fetchSockets()
    .then((sockets) => {
      sockets[0].emit(MessageType.INFO, {
        msg: Message.player_get_data,
        userData: sockets[0].data,
      });
    });
}

/**
 * Set the points of the calling socket
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {number} points The points to set for the socket
 */
function setPoints(io: Server, socket: Socket, points: number) {
  if (socket.data.currentRoom) {
    socket.data.points = points;
    socket.emit(MessageType.DEBUG, {
      msg: Message.user_set_points,
      points: socket.data.points,
    });
  } else {
    socket.emit(MessageType.ERROR, { msg: Message.user_not_in_a_room });
  }
}

/**
 * Sends a message to the caller containing their points
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 */
function getPoints(io: Server, socket: Socket) {
  if (socket.data.currentRoom) {
    socket.emit(MessageType.INFO, {
      msg: Message.player_get_points,
      points: socket.data.points,
    });
  } else {
    socket.emit(MessageType.ERROR, { msg: Message.user_not_in_a_room });
  }
}
