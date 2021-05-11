import { Server, Socket } from "socket.io";
import { MessageType, Message, CallbackFn, Piles } from "../models/types";

let cardsMap = new Map();
for (let i = 0; i <= 310; i++) {
    cardsMap.set(i, Piles.Deck);

}

export function registerCardHandlers(io: Server, socket: Socket) {
    socket.on("card:move", (cardId: number, targetPile: number, callback?: CallbackFn) =>
        moveCard(io, socket, cardId, targetPile, callback ?? (() => { }))
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
function moveCard(io: Server, socket: Socket, cardId: number, targetPile: Piles, callback?: CallbackFn) {
    if (!socket.data.currentRoom) {
        callback({
            status: "err",
            msg: Message.user_not_in_a_room,
        });
    } else {
        let sourcePile = cardsMap.get(cardId);
        if (cardId > 310) {
            callback({
                status: "err",
                msg: Message.card_doesnt_exist,
            });

        } else if (!Piles[targetPile]) {
            callback({
                status: "err",
                msg: Message.pile_doesnt_exist,
            });

        } else if (!(targetPile === Piles.Deck || (targetPile <= Piles.player4 && cardsMap.get(targetPile) <= 8) || (cardsMap.get(targetPile) < 1))) {
            callback({
                status: "err",
                msg: Message.pile_is_full,
            });
        } else {
            cardsMap.set(cardId, targetPile);

            io.in(socket.data.currentRoom).emit("card:moved", { sourcePile, targetPile, cardId:pad(cardId,3) });
            callback({
                status: "ok",
                msg: Message.card_moved,
            });

        }


    }
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