"use strict";

const Service = require("egg").Service;
const identicon = require("identicon");
const fs = require("fs");
const FormStream = require("formstream");

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
    let user = await this.checkUser(_id);
    user.email = undefined;
    user.phone = undefined;
    user.password = undefined;
    return user;
  }

  async create(payload) {
    const { ctx, service } = this;
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

    const buffer = identicon.generateSync({ id: payload.userName, size: 160 });
    // const form = new FormStream();
    // form.buffer("image", buffer, "image.png");
    const backup = true;
    const resAvatar = await service.pic.uploadStream({ buffer, backup });
    console.log("resAvatar:", resAvatar);
    payload.avatar = resAvatar.url;
    payload.avatarBackup = resAvatar.urlBackup;
    // fs.writeFileSync(this.config.baseDir + "/app/public/identicon.png", buffer);
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
    let user = await this.checkUser(_id);
    // delete user.password;
    user.password = undefined;
    return user;
  }

  async update(payload) {
    const { ctx } = this;
    const _id = ctx.state.user.data._id;
    let user = await this.checkUser(_id);
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
    let user = await this.checkUser(_id);
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
    let user = await this.checkUser(_id);
    const verifyPsw = await ctx.compare(password, user.password);
    if (!verifyPsw) ctx.throw(401);
    return ctx.model.User.findByIdAndRemove(_id);
  }

  // common func

  async find(_id) {
    return this.ctx.model.User.findById(_id);
  }

  async checkUser(_id) {
    const user = await this.find(_id);
    if (!user) {
      this.ctx.throw(404, "user not found");
    }
    return user;
  }
}

module.exports = UserService;
