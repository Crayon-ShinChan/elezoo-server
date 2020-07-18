"use strict";

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
  const { router, controller } = app;
  router.get("/", controller.home.index);
  router.get("/api/user", controller.user.index);
  router.get("/api/user/show/:id", controller.user.show);
  router.post("/api/user/signup", controller.user.create);
};
