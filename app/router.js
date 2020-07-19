"use strict";

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
  const { router, controller, jwt } = app;
  router.get("/", controller.home.index);
  router.get("/api/user", controller.user.index);
  router.get("/api/user/:id", controller.user.show);
  router.post("/api/user/signup", controller.user.create);
  router.put("/api/user/:id", controller.user.update);
  router.delete("/api/user/:id", controller.user.destroy);

  router.post("/api/user/access/login", controller.userAccess.login);
  router.get("/api/user/access/current", jwt, controller.userAccess.current);
};
