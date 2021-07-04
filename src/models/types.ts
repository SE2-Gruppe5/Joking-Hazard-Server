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
  currentPlayer = "current_player",
  user_is_current_player = "user_is_current_player",
  card_moved = "card_moved",
  card_doesnt_exist = "card_doesnt_exist",
  pile_doesnt_exist = "pile_doesnt_exist",
  invalid_pile_index = "invalid_pile_index",
  invalid_time_limit = "invalid_time_limit",
  invalid_point_limit = "invalid_point_limit",
  game_over = "game_over",
}

export enum Piles {
  deck,
  player1,
  player2,
  player3,
  player4,
  panel1,
  panel2,
  panel3,
  submission,
  discard,
}

export interface CallbackObject {
  status: "ok" | "err";
  msg: Message;
  [args: string]: any;
}

export type CallbackFn = (obj: { game: GameObject }) => void;

export interface GameObject {
  players: string[];
  currentPlayer: number;
  currentJudge: number;
  playersLeft: number;
  currentRound: number;
  timeLimit: number;
  pointLimit: number;
  lastPlayerCheated: string;
}
