/* eslint valid-jsdoc: "off" */

"use strict";

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = (appInfo) => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {});

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + "_1594736839283_1350";

  // add your middleware config here
  config.middleware = ["errorHandler"];

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  config.mongoose = {
    client: {
      url:
        "mongodb+srv://kuiliang:zklzwcGG123@cluster0.ljvzl.mongodb.net/elezoo?retryWrites=true&w=majority",
      options: { useUnifiedTopology: true },
      // mongoose global plugins, expected a function or an array of function and options
      // plugins: [createdPlugin, [updatedPlugin, pluginOptions]],
    },
  };

  config.security = {
    csrf: {
      enable: false,
    },
  };

  config.bcrypt = {
    saltRounds: 10,
  };

  config.jwt = {
    secret: "971028",
  };

  return {
    ...config,
    ...userConfig,
  };
};
