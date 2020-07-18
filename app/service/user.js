"use strict";

const Service = require("egg").Service;

class UserService extends Service {
  async create(payload) {
    const { ctx } = this;
    const users = await ctx.model.User.find({
      email: payload.email,
    });
    if (users.length >= 1) {
      ctx.throw(409, "mail exists");
      return;
    }
    payload.password = await ctx.genHash(payload.password);
    return ctx.model.User.create(payload);
  }
}

module.exports = UserService;
