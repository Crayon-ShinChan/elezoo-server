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
  router.patch("/api/user/forget", controller.user.forget);
  router.patch("/api/user/reset/:id", controller.user.reset);

  router.post("/api/pic", controller.pic.upload);
  router.post("/api/pic/stream", controller.pic.uploadStream);
  router.post("/api/pic/songkeys", controller.pic.uploadStreamSonkeys);

  router.get("/api/vote", jwt, controller.vote.index);
  router.get("/api/vote/:id", jwt, controller.vote.show);
  router.get("/api/vote/hasvoted/:id", jwt, controller.vote.hasVoted);
  router.get("/api/vote/period/:id", jwt, controller.vote.getVotePeriod);
  router.post("/api/vote/create", jwt, controller.vote.create);
  router.delete("/api/vote/:id", jwt, controller.vote.destroy);
  router.delete("/api/vote/proposal/:id", jwt, controller.vote.deleteProposal);
  router.put("/api/vote/basic/:id", jwt, controller.vote.updateBasic);
  router.put("/api/vote/invite/:id", jwt, controller.vote.invite);
  router.put("/api/vote/next/:id", jwt, controller.vote.nextPeriod);
  router.put("/api/vote/propose/:id", jwt, controller.vote.propose);
  router.put("/api/vote/vote/:id", jwt, controller.vote.vote);
  router.patch("/api/vote/share/:id", jwt, controller.vote.share);
  router.patch("/api/vote/accept/:id", jwt, controller.vote.acceptShare);
  router.patch("/api/vote/resetshareid/:id", jwt, controller.vote.resetShareId);
  router.patch("/api/vote/leave/:id", jwt, controller.vote.leave);
};
