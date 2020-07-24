"use strict";

const Service = require("egg").Service;

class UserService extends Service {
  async index() {
    const users = await this.ctx.model.User.find({});
    if (!users) {
      this.ctx.throw(404, "users not found");
    }
    users.forEach((user) => {
      user.email = undefined;
      user.phone = undefined;
      user.password = undefined;
    });
    return users;
  }

  async show(_id) {
    const user = await this.find(_id);
    if (!user) {
      this.ctx.throw(404, "user not found");
    }
    user.email = undefined;
    user.phone = undefined;
    user.password = undefined;
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
    // console.log(users);
    if (users.length >= 1) {
      ctx.throw(409, "userName or email or phone exists");
      return;
    }
    payload.password = await ctx.genHash(payload.password);
    return ctx.model.User.create(payload);
  }

  async login(payload) {
    const { ctx, service } = this;
    let result = await service.user.loginByInfo(
      { email: payload.account },
      payload.password
    );
    if (result) return result;
    result = await service.user.loginByInfo(
      { userName: payload.account },
      payload.password
    );
    if (result) return result;
    ctx.throw(401, "用户信息错误。");
  }

  async loginByInfo(account, password) {
    const { ctx, service } = this;
    const user = await ctx.model.User.findOne(account);
    if (!user) {
      return false;
    }
    const verifyPsw = await ctx.compare(password, user.password);
    return verifyPsw
      ? { token: await service.actionToken.apply(user._id) }
      : false;
  }

  async current() {
    const { ctx, service } = this;
    // ctx.state.user 可以提取到JWT编码的data
    const _id = ctx.state.user.data._id;
    let user = await service.user.find(_id);
    if (!user) {
      ctx.throw(404, "user is not found");
    }
    // delete user.password;
    user.password = undefined;
    return user;
  }

  async update(payload) {
    const { ctx } = this;
    const _id = ctx.state.user.data._id;
    const user = await this.find(_id);
    if (!user) {
      ctx.throw(404, "user not found");
    }
    if (payload.password) {
      delete payload.password;
    }
    console.log(payload);
    const res = await ctx.model.User.findByIdAndUpdate(_id, payload, {
      new: true,
    });
    res.password = undefined;
    return res;
  }

  async updatePassword(payload) {
    const { ctx } = this;
    const { oldPassword, password } = payload;
    const _id = ctx.state.user.data._id;
    const user = await this.find(_id);
    if (!user) {
      ctx.throw(404, "user not found");
    }
    const verifyPsw = await ctx.compare(oldPassword, user.password);
    if (!verifyPsw) {
      ctx.throw(401);
    }
    const newPassword = await ctx.genHash(password);
    return ctx.model.User.findByIdAndUpdate(
      _id,
      { password: newPassword },
      { new: true }
    );
  }

  async destroy(password) {
    const { ctx } = this;
    const _id = ctx.state.user.data._id;
    const user = await this.find(_id);
    if (!user) {
      ctx.throw(404, "user not found");
    }
    const verifyPsw = await ctx.compare(password, user.password);
    if (!verifyPsw) {
      ctx.throw(401);
    }
    return ctx.model.User.findByIdAndRemove(_id);
  }

  async find(id) {
    return this.ctx.model.User.findById(id);
  }
}

module.exports = UserService;
