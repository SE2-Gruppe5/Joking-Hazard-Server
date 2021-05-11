/**
 * Message types
 *
 * @enum {number} The message type
 */
export enum MessageType {
  ERROR = "msg:error",
  WARN = "msg:warn",
  INFO = "msg:info",
  DEBUG = "msg:debug",
}

/**
 * Messages
 *
 * @export
 * @enum {number} The message
 */

export enum Message {
    already_in_room = "already_in_room",
    no_free_room = "no_free_room",
    room_doesnt_exist = "room_doesnt_exist",
    room_full = "room_full",
    room_created = "room_created",
    room_joined = "room_joined",
    room_closed = "room_closed",
    room_left = "room_left",
    user_joined_game = "user_joined_game",
    user_left_game = "user_left_game",
    user_became_admin = "user_became_admin",
    user_not_an_admin = "user_not_an_admin",
    user_not_in_a_room = "user_not_in_a_room",
    player_get_points = "player_get_points",
    player_get_data = "player_get_data",
    user_changed_name = "user_changed_name",
    all_players_get_data = "all_players_get_data",
    user_set_points = "user_set_points",
    user_doesnt_exist = "user_doesnt_exist",
    currentPlayer = 'current_player',
    user_is_current_player = 'user_is_current_player',
    card_moved = "card_moved",
    card_doesnt_exist = "card_doesnt_exist",
    pile_doesnt_exist = "pile_doesnt_exist",
    pile_is_full = "pile_is_full"
}


export enum Piles {
  Deck = 0,
  player1 = 1,
  player2 = 2,
  player3= 3,
  player4= 4,
  panel1= 5,
  panel2= 6,
  panel3= 7,
  submission1= 8,
  submission2= 9,
  submission3= 10,
  discard= 11,
  
}

interface CallbackObject {
  status: string;
  msg: string;
  [args: string]: any;
}

export type CallbackFn = (obj: CallbackObject) => void;

export interface GameObject {
  players: string [], 
  currentPlayer: number,
  currentJudge: number,
  playersLeft: number,
  currentRound: number,

}
