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

  // config.security = {
  //   csrf: {
  //     ignoreJSON: true, // 默认为 false，当设置为 true 时，将会放过所有 content-type 为 `application/json` 的请求
  //   },
  // };

  config.security = {
    csrf: {
      // 让 api 接口不开启 csrf：判断是否需要 ignore 的方法，请求上下文 context 作为第一个参数
      ignore: (ctx) => {
        if (
          ctx.request.url == "/alipay/alipayNotify" ||
          ctx.request.url == "/weixinpay/weixinpayNotify"
        ) {
          return true;
        } else if (ctx.request.url.indexOf("/api") != -1) {
          return true;
        } else {
          return false;
        }
      },
    },
    domainWhiteList: ["http://localhost:3333"],
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
