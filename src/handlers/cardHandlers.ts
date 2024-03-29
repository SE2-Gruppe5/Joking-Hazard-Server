import { Server, Socket } from "socket.io";
import { Message, CallbackFn, Piles } from "../models/types";
import { pad } from "./roomHandlers";

const cardsMaps = new Map<string, Map<Piles, string[]>>();

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
      sourcePile: number,
      targetPile: number,
      sourceIndex: number,
      targetIndex: number,
      callback?: CallbackFn
    ) =>
      moveCard(
        io,
        socket,
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
    let cardsMap =
      cardsMaps.get(socket.data.currentRoom) ??
      createCardsMap(socket.data.currentRoom);
    if (!Piles[targetPile]) {
      callback({
        status: "err",
        msg: Message.pile_doesnt_exist,
      });
    } else if (
      !(
        (targetPile >= Piles.player1 &&
          targetPile <= Piles.player4 &&
          targetIndex < 8) ||
        targetIndex === 0
      )
    ) {
      callback({
        status: "err",
        msg: Message.invalid_pile_index,
      });
    } else if (
      !(
        (sourcePile >= Piles.player1 &&
          sourcePile <= Piles.player4 &&
          sourceIndex < 8) ||
        (sourcePile === Piles.submission && sourceIndex < 3) ||
        sourceIndex === 0
      )
    ) {
      callback({
        status: "err",
        msg: Message.invalid_pile_index,
      });
    } else {
      let cardId: string;
      // If we're taking a card from the deck, we always want to take the top card and shift the rest forward
      if (sourcePile === Piles.deck) {
        cardId = cardsMap.get(sourcePile).shift();
        cardsMap.get(sourcePile).push(null);
      } else {
        cardId = cardsMap.get(sourcePile)[sourceIndex];
        cardsMap.get(sourcePile)[sourceIndex] = null;
      }

      // If we're putting a card on the discard or submission pile , we don't need an index, we just push the card onto it
      if (targetPile === Piles.discard || targetPile === Piles.submission) {
        cardsMap.get(targetPile).push(cardId);
      } else {
        cardsMap.get(targetPile)[targetIndex] = cardId;
      }
      io.in(socket.data.currentRoom).emit("card:moved", {
        cardId,
        sourcePile,
        sourceIndex,
        targetPile,
        targetIndex,
        socketId: socket.id,
      });
      callback({
        status: "ok",
        msg: Message.card_moved,
      });
    }
  }
}

export function createCardsMap(roomCode: string) {
  let cardsMap = new Map<Piles, string[]>();
  let cards = new Array<string>();
  for (let i = 1; i <= 310; i++) {
    cards.push(pad(i, 3));
  }

  // Shuffle cards
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
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

  cardsMaps.set(roomCode, cardsMap);

  return cardsMaps.get(roomCode);
}

export function removeCardsMap(roomCode: string) {
  cardsMaps.delete(roomCode);
}
