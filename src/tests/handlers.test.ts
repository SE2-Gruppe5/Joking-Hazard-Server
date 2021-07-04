import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { Message, MessageType, Piles } from "../models/types";
import { registerRoomHandlers, joinRoom } from "../handlers/roomHandlers";
import { registerUserHandlers } from "../handlers/userHandlers";
import { registerCardHandlers } from "../handlers/cardHandlers";

const Client = require("socket.io-client");

describe("tests", () => {
  let io: Server,
    serverSocket: any,
    clientSockets = Array(5),
    port: number;

  const roomIds = [];
  for (let i = 0; i <= 9999; i++) {
    var s = "0000" + i;
    let id = s.substr(s.length - 4);
    roomIds.push(id);
  }

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      let address = httpServer.address();
      port = typeof address === "string" ? 0 : address.port;
      io.on("connection", (socket: any) => {
        serverSocket = socket;
        registerRoomHandlers(io, socket);
        registerUserHandlers(io, socket);
        registerCardHandlers(io, socket);
      });
      done();
    });
  });

  beforeEach((done) => {
    for (let i = 0; i < clientSockets.length; i++) {
      clientSockets[i] = new Client(`http://localhost:${port}`);
    }
    clientSockets.forEach((socket, index) =>
      socket.on("connect", () => {
        socket.on(MessageType.INFO, (response) =>
          console.log("msg to: " + index + " with content: ", response)
        );
        socket.emit("user:name:change", index);
        done();
      })
    );
  });

  afterAll(() => {
    io.close();
  });

  afterEach(() => {
    clientSockets.forEach((socket) => socket.close());
  });

  // room:create tests

  test("test room:create", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (response) => {
      expect(response.status == "ok");
      done();
    });
  });

  test("test room:create with no free rooms", (done) => {
    io.socketsJoin(roomIds);
    clientSockets[0].emit("room:create", 0, 5, (response) => {
      expect(
        response.status === "err" && response.msg === Message.no_free_room
      );
      done();
    });
  });

  test("test room:create while already in a room", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit("room:create", 0, 5, (response) => {
        expect(
          response.status === "err" && response.msg === Message.already_in_room
        );
        done();
      });
    });
  });

  test("test room:create while already in a room", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit("room:create", 0, 5, (response) => {
        expect(
          response.status === "err" && response.msg === Message.already_in_room
        );
        done();
      });
    });
  });

  // room:join tests

  test("test room:join", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (response) => {
      clientSockets[1].emit("room:join", response.roomCode, (response) => {
        expect(response.status === "ok");
        done();
      });
    });
  });

  test("test room:join while already in a room", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (response) => {
      clientSockets[1].emit("room:join", response.roomCode);
    });
    clientSockets[2].emit("room:create", 0, 5, (response) => {
      clientSockets[1].emit("room:join", response.roomCode, (response) => {
        expect(
          response.status === "err" && response.msg === Message.already_in_room
        );
        done();
      });
    });
  });

  test("test room:join with full room", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (response) => {
      clientSockets[1].emit("room:join", response.roomCode, (response) => {
        expect(response.status === "ok");
      });
      clientSockets[2].emit("room:join", response.roomCode, (response) => {
        expect(response.status === "ok");
      });
      clientSockets[3].emit("room:join", response.roomCode, (response) => {
        expect(response.status === "ok");
      });
      clientSockets[4].emit("room:join", response.roomCode, (response) => {
        expect(response.status === "err" && response.msg === Message.room_full);
        done();
      });
    });
  });

  test("test room:join with non-existing room", (done) => {
    clientSockets[0].emit("room:join", "9999", (response) => {
      expect(
        response.status === "err" && response.msg === Message.room_doesnt_exist
      );
      done();
    });
  });

  // room:close tests

  test("test room:close", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (response) => {
      expect(response.status === "ok");
      clientSockets[0].emit("room:close", (response) => {
        expect(response.status === "ok");
        done();
      });
    });
  });

  test("test room:close as non-admin", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (response) => {
      expect(response.status === "ok");
      clientSockets[1].emit("room:join", response.roomCode, (response) => {
        expect(response.status === "ok");
        clientSockets[1].emit("room:close", (response) => {
          expect(
            response.status === "err" &&
              response.msg === Message.user_not_an_admin
          );
          done();
        });
      });
    });
  });

  test("test room:close while not in a room", (done) => {
    clientSockets[0].emit("room:close", (response) => {
      expect(
        response.status === "err" && response.msg === Message.user_not_in_a_room
      );
      done();
    });
  });

  // room:leave tests

  test("test room:leave", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (response) => {
      expect(response.status === "ok");
      clientSockets[0].emit("room:leave", (response) => {
        expect(response.status === "ok");
        done();
      });
    });
  });

  test("test room:leave as non-admin", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (response) => {
      expect(response.status === "ok");
      clientSockets[1].emit("room:join", response.roomCode, (response) => {
        expect(response.status === "ok");
        clientSockets[1].emit("room:leave", (response) => {
          expect(response.status === "ok");
          done();
        });
      });
    });
  });

  test("test room:leave as admin while others are in the room", (done) => {
    clientSockets[1].on(MessageType.INFO, (response) => {
      if (response.msg === Message.user_became_admin) {
        done();
      }
    });

    clientSockets[0].emit("room:create", 0, 5, (response) => {
      clientSockets[1].emit("room:join", response.roomCode, (_response) => {
        clientSockets[0].emit("room:leave", () => {});
      });
    });
  });

  test("test room:leave while not in a room", (done) => {
    clientSockets[0].emit("room:leave", (response) => {
      expect(
        response.status === "err" && response.msg === Message.user_not_in_a_room
      );
      done();
    });
  });

  // Test room:players

  test("test room:players", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (response) => {
      clientSockets[1].emit("room:join", response.roomCode);
      clientSockets[2].emit("room:join", response.roomCode);
      clientSockets[0].emit("room:players", (response) => {
        expect(response.status === "ok" && response.users.length === 3);
        done();
      });
    });
  });
  // user tests

  test("test user:data:get", (done) => {
    clientSockets[0].emit("user:data:get", clientSockets[0].id, (response) => {
      expect(response.status === "ok" && response.userData.name === "0");
      done();
    });
  });

  test("test user:data:get when user doesn't exist", (done) => {
    clientSockets[0].emit("user:data:get", "0", (response) => {
      expect(
        response.status === "err" && response.msg === Message.user_doesnt_exist
      );
      done();
    });
  });

  test("test user:points:get", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit(
        "user:points:get",
        clientSockets[0].id,
        (response) => {
          expect(response.status === "ok" && response.points === 0);
          done();
        }
      );
    });
  });

  test("test user:points:get with user not in a room", (done) => {
    clientSockets[0].emit(
      "user:points:get",
      clientSockets[0].id,
      (response) => {
        expect(
          response.status === "err" &&
            response.msg === Message.user_not_in_a_room
        );
        done();
      }
    );
  });

  test("test user:points:get when user doesn't exist", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit("user:points:get", "0", (response) => {
        expect(
          response.status === "err" &&
            response.msg === Message.user_doesnt_exist
        );
        done();
      });
    });
  });

  test("test user:points:add", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit(
        "user:points:add",
        clientSockets[0].id,
        1,
        (_response) => {
          clientSockets[0].emit(
            "user:points:get",
            clientSockets[0].id,
            (response) => {
              expect(response.status === "ok" && response.points === 1);
              done();
            }
          );
        }
      );
    });
  });

  test("test user:points:add with user not in a room", (done) => {
    clientSockets[0].emit(
      "user:points:add",
      clientSockets[0].id,
      1,
      (_response) => {
        clientSockets[0].emit(
          "user:points:get",
          clientSockets[0].id,
          (response) => {
            expect(
              response.status === "err" &&
                response.msg === Message.user_not_in_a_room
            );
            done();
          }
        );
      }
    );
  });

  test("test user:points:add when user doesn't exist", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit(
        "user:points:add",
        clientSockets[0].id,
        1,
        (_response) => {
          clientSockets[0].emit("user:points:get", "0", (response) => {
            expect(
              response.status === "err" &&
                response.msg === Message.user_doesnt_exist
            );
            done();
          });
        }
      );
    });
  });

  test("test user:points:set", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit(
        "user:points:set",
        clientSockets[0].id,
        5,
        (_response) => {
          clientSockets[0].emit(
            "user:points:get",
            clientSockets[0].id,
            (response) => {
              expect(response.status === "ok" && response.points === 5);
              done();
            }
          );
        }
      );
    });
  });

  test("test user:points:set with user not in a room", (done) => {
    clientSockets[0].emit(
      "user:points:set",
      clientSockets[0].id,
      1,
      (_response) => {
        clientSockets[0].emit(
          "user:points:get",
          clientSockets[0].id,
          (response) => {
            expect(
              response.status === "err" &&
                response.msg === Message.user_not_in_a_room
            );
            done();
          }
        );
      }
    );
  });

  test("test user:points:set when user doesn't exist", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit(
        "user:points:set",
        clientSockets[0].id,
        5,
        (_response) => {
          clientSockets[0].emit("user:points:get", "0", (response) => {
            expect(
              response.status === "err" &&
                response.msg === Message.user_doesnt_exist
            );
            done();
          });
        }
      );
    });
  });

  test("test card:move", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit(
        "card:move",
        Piles.deck,
        Piles.discard,
        0,
        0,
        (response) => {
          expect(
            response.status === "ok" && response.msg === Message.card_moved
          );
          done();
        }
      );
    });
  });

  test("test card:move with invalid index", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit(
        "card:move",
        Piles.deck,
        Piles.discard,
        0,
        9,
        (response) => {
          expect(
            response.status === "err" &&
              response.msg === Message.invalid_pile_index
          );
          done();
        }
      );
    });
  });

  test("test card:move with invalid pile", (done) => {
    clientSockets[0].emit("room:create", 0, 5, (_response) => {
      clientSockets[0].emit("card:move", Piles.deck, -1, 0, 0, (response) => {
        expect(
          response.status === "err" &&
            response.msg === Message.pile_doesnt_exist
        );
        done();
      });
    });
  });

  test("test card:move with user not in a room", (done) => {
    clientSockets[0].emit(
      "card:move",
      Piles.deck,
      Piles.discard,
      0,
      0,
      (response) => {
        expect(
          response.status === "err" &&
            response.msg === Message.user_not_in_a_room
        );
        done();
      }
    );
  });

  test("room:playerCheated", (done) => {
    clientSockets[0].emit("room:create", 10, 10, (response) => {
      clientSockets[1].emit("room:join", response.roomCode, () => {
        clientSockets[1].emit("room:playerCheated", clientSockets[0].id, () => {
          clientSockets[1].emit("room:getGameObject", (response1) => {
            let game = response1.game;
            expect(
              response1.status === "ok" &&
                game.lastPlayerCheated === clientSockets[0].id
            );
            done();
          });
        });
      });
    });
  });

  test("room:playerCheated", (done) => {
    clientSockets[0].emit("room:create", 10, 10, (response) => {
      clientSockets[1].emit("room:join", response.roomCode, () => {
        clientSockets[0].emit("room:playerCheated", clientSockets[1].id, () => {
          clientSockets[0].emit(
            "room:playerCheated",
            clientSockets[0].id,
            () => {
              clientSockets[0].emit("room:getGameObject", (response1) => {
                let game = response1.game;
                expect(
                  response1.status === "ok" &&
                    game.lastPlayerCheated === clientSockets[0].id
                );
                done();
              });
            }
          );
        });
      });
    });
  });

  test("room:playerCaught", (done) => {
    clientSockets[0].emit("room:create", 10, 10, (response) => {
      clientSockets[1].emit("room:join", response.roomCode, () => {
        clientSockets[1].emit("room:playerCheated", clientSockets[1].id, () => {
          clientSockets[0].emit(
            "room:playerCaught",
            clientSockets[1].id,
            (response1) => {
              clientSockets[0].emit(
                "user:points:get",
                clientSockets[0].id,
                (response3) => {
                  expect(response1.status === "ok" && response3.points == -2);
                  done();
                }
              );
            }
          );
        });
      });
    });
  });

  test("room:playerCaught", (done) => {
    clientSockets[0].emit("room:create", 10, 10, (response) => {
      clientSockets[1].emit("room:join", response.roomCode, () => {
        clientSockets[1].emit(
          "room:playerCheated",
          clientSockets[1].id,
          (response1) => {
            clientSockets[0].emit(
              "room:playerCaught",
              clientSockets[0].id,
              (response2) => {
                clientSockets[0].emit(
                  "user:points:get",
                  clientSockets[0].id,
                  (response3) => {
                    expect(response1.status === "ok" && response3.points == -2);
                    done();
                  }
                );
              }
            );
          }
        );
      });
    });
  });
});
