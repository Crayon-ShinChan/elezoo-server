"use strict";

/** @type Egg.EggPlugin */
module.exports = {
  // had enabled by egg
  // static: {
  //   enable: true,
  // }
  mongoose: {
    enable: true,
    package: "egg-mongoose",
  },
  bcrypt: {
    enable: true,
    package: "egg-bcrypt",
  },
  validate: {
    enable: true,
    package: "egg-validate",
  },
  jwt: {
    enable: true,
    package: "egg-jwt",
  },
  cors: {
    enable: true,
    package: "egg-cors",
  },
};
