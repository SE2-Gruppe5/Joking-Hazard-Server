import { Server, Socket } from "socket.io";
import { Message, CallbackFn, Piles } from "../models/types";
import { pad } from "./roomHandlers";

/**
 * A map mapping every card to a pile
 */
let cardsMap = new Map<Piles, string[]>();
let cards = new Array<string>(311);
for (let i = 0; i <= 310; i++) {
  cards.push(pad(i, 3));
}

cardsMap.set(Piles.deck, cards);
cardsMap.set(Piles.panel1, []);
cardsMap.set(Piles.panel2, []);
cardsMap.set(Piles.panel3, []);
cardsMap.set(Piles.player1, []);
cardsMap.set(Piles.player2, []);
cardsMap.set(Piles.player3, []);
cardsMap.set(Piles.player4, []);
cardsMap.set(Piles.submission, []);
cardsMap.set(Piles.discard, []);

/**
 * Registers card handlers
 *
 * @export
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 */
export function registerCardHandlers(io: Server, socket: Socket) {
  socket.on(
    "card:move",
    (
      cardId: string,
      sourcePile: number,
      targetPile: number,
      sourceIndex: number,
      targetIndex: number,
      callback?: CallbackFn
    ) =>
      moveCard(
        io,
        socket,
        cardId,
        sourcePile,
        targetPile,
        sourceIndex,
        targetIndex,
        callback ?? (() => {})
      )
  );
}

/**
 * Moves a card from one pile to another and tells everyone about it
 *
 * @param {Server} io The server object
 * @param {Socket} socket The socket
 * @param {string} cardId The id of the card (001 - 310)
 * @param {Piles} sourcePile The pile from which the card gets moved
 * @param {Piles} targetPile The pile to which the card gets moved
 * @param {number} sourceIndex The index of the card in the source pile
 * @param {number} targetIndex The index of the card in the target pile
 * @param {CallbackFn} [callback] The callback sent to the caller
 */
export function moveCard(
  io: Server,
  socket: Socket,
  cardId: string,
  sourcePile: Piles,
  targetPile: Piles,
  sourceIndex: number,
  targetIndex: number,
  callback?: CallbackFn
) {
  if (!socket.data.currentRoom) {
    callback({
      status: "err",
      msg: Message.user_not_in_a_room,
    });
  } else {
    if (+cardId > 310) {
      callback({
        status: "err",
        msg: Message.card_doesnt_exist,
      });
    } else if (!Piles[targetPile]) {
      callback({
        status: "err",
        msg: Message.pile_doesnt_exist,
      });
    } else if (
      !(
        targetPile === Piles.deck ||
        (targetPile <= Piles.player4 && targetIndex >= 8) ||
        targetIndex >= 1
      )
    ) {
      callback({
        status: "err",
        msg: Message.pile_is_full,
      });
    } else {
      cardsMap.get(sourcePile)[sourceIndex] = null;
      cardsMap.get(targetPile)[targetIndex] = cardId;
      io.in(socket.data.currentRoom).emit("card:moved", {
        cardId,
        sourcePile,
        sourceIndex,
        targetPile,
        targetIndex,
      });
      callback({
        status: "ok",
        msg: Message.card_moved,
      });
    }
  }
}
