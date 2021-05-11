import { Server, Socket } from "socket.io";
import { MessageType, Message, CallbackFn } from "../models/types";


export function registerCardHandlers(io: Server, socket: Socket) {
    socket.on("card:move", (callback?: CallbackFn) =>
        moveCard(io, socket, callback ?? (() => { }))
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
function moveCard(io: Server, socket: Socket, callback?: CallbackFn) {

}


/**
 * Pads the number with zeroes
 *
 * @param {number} num The number
 * @param {number} size The length of the desired string
 * @return {*}  {string} The padded string
 */
 function pad(num: number, size: number): string {
    var s = "000" + num;
    return s.substr(s.length - size);
  }