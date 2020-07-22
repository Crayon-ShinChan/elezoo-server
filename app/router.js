"use strict";

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
  const { router, controller, jwt } = app;
  router.get("/", controller.home.index);
  router.get("/api/user", controller.user.index);
  router.get("/api/user/:id", controller.user.show);
  router.get("/api/user/current", jwt, controller.user.current);
  router.post("/api/user/create", controller.user.create);
  router.post("/api/user/login", controller.user.login);
  // router.put("/api/user/:id", controller.user.update);
  router.put("/api/user", jwt, controller.user.update);
  router.put("/api/user/password", jwt, controller.user.updatePassword);
  router.delete("/api/user", jwt, controller.user.destroy);
};
