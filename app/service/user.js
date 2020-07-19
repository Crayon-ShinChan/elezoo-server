"use strict";

const Service = require("egg").Service;

class UserService extends Service {
  async index() {
    const users = await this.ctx.model.User.find({});
    if (!users) {
      this.ctx.throw(404, "users not found");
    }
    return users;
  }

  async show(_id) {
    const user = await this.ctx.service.user.find(_id);
    if (!user) {
      this.ctx.throw(404, "user not found");
    }
    return user;
  }

  async create(payload) {
    const { ctx } = this;
    const users = payload.phone
      ? await ctx.model.User.find({
          $or: [
            { email: payload.email },
            { userName: payload.userName },
            { phone: payload.phone },
          ],
        })
      : await ctx.model.User.find({
          $or: [{ email: payload.email }, { userName: payload.userName }],
        });
    console.log(users);
    if (users.length >= 1) {
      ctx.throw(409, "username/email/phone exists");
      return;
    }
    payload.password = await ctx.genHash(payload.password);
    return ctx.model.User.create(payload);
  }

  async update(_id, payload) {
    const { ctx } = this;
    const user = await ctx.service.user.find(_id);
    if (!user) {
      ctx.throw(404, "user not found");
    }
    return ctx.model.User.findByIdAndUpdate(_id, payload, { new: true });
  }

  async destroy(_id) {
    const { ctx, service } = this;
    const user = await ctx.service.user.find(_id);
    if (!user) {
      ctx.throw(404, "user not found");
    }
    return ctx.model.User.findByIdAndRemove(_id);
  }

  async find(id) {
    return this.ctx.model.User.findById(id);
  }
}

module.exports = UserService;
