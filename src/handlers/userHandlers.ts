import { RemoteSocket, Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Message, CallbackFn } from "../models/types";

/**
 * Registers user handlers
 *
 * @export
 * @param {Server} io The Server object
 * @param {Socket} socket The socket that received a signal
 */
export function registerUserHandlers(io: Server, socket: Socket) {
  socket.on("user:name:change", (name: string, callback?: CallbackFn) =>
    changeName(socket, name, callback ?? (() => {}))
  );

  socket.on("user:data:get", (id: string, callback?: CallbackFn) =>
    getSocketById(io, id).then((socket) => {
      getUserData(socket, callback ?? (() => {}));
    })
  );

  socket.on(
    "user:points:set",
    (id: string, points: number, callback?: CallbackFn) =>
      getSocketById(io, id).then((socket) => {
        setPoints(socket, points, callback ?? (() => {}));
      })
  );
  socket.on(
    "user:points:add",
    (id: string, points: number, callback?: CallbackFn) =>
      getSocketById(io, id).then((socket) => {
        addPoints(socket, points, callback ?? (() => {}));
      })
  );
  socket.on("user:points:get", (id: string, callback?: CallbackFn) =>
    getSocketById(io, id).then((socket) => {
      getPoints(socket, callback ?? (() => {}));
    })
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
function getUserData(
  socket: RemoteSocket<DefaultEventsMap> | undefined,
  callback: CallbackFn
) {
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
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {number} points The points to set for the socket
 */
function setPoints(
  socket: RemoteSocket<DefaultEventsMap> | undefined,
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
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {number} points The points to set for the socket
 */
function addPoints(
  socket: RemoteSocket<DefaultEventsMap> | undefined,
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
function getPoints(
  socket: RemoteSocket<DefaultEventsMap> | undefined,
  callback: CallbackFn
) {
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

export async function getSocketById(
  io: Server,
  id: string
): Promise<any> {
  let sockets = await io.in(id).fetchSockets();

  if (sockets.length == 0) {
    return undefined;
  } else {
    return sockets[0];
  }
}
