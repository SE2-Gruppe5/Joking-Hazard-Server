import * as pino from "pino";

export const logger = pino({
  name: "joking-hazard-server",
  level: "debug",
});
