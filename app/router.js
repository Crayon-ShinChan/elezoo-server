"use strict";

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
  const { router, controller, jwt } = app;

  router.get("/", controller.home.index);
  router.get("/api/user", controller.user.index);
  router.get("/api/user/current", jwt, controller.user.current);
  router.get("/api/user/:id", controller.user.show);
  router.post("/api/user/create", controller.user.create);
  router.post("/api/user/login", controller.user.login);
  // router.put("/api/user/:id", controller.user.update);
  router.put("/api/user", jwt, controller.user.update);
  router.put("/api/user/password", jwt, controller.user.updatePassword);
  router.delete("/api/user", jwt, controller.user.destroy);

  router.post("/api/pic", controller.pic.upload);
  router.post("/api/pic/stream", controller.pic.uploadStream);
  router.post("/api/pic/songkeys", controller.pic.uploadStreamSonkeys);

  router.get("/api/vote", jwt, controller.vote.index);
  router.post("/api/vote/create", jwt, controller.vote.create);
  router.get("/api/vote/:id", jwt, controller.vote.show);
  router.delete("/api/vote/:id", jwt, controller.vote.destroy);
  router.put("/api/vote/leave/:id", jwt, controller.vote.leave);
  router.put("/api/vote/invite/:id", jwt, controller.vote.invite);
  router.put("/api/vote/period", jwt, controller.vote.updatePeriod);
};
