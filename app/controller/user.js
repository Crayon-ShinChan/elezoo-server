"use strict";

const Controller = require("egg").Controller;

class UserController extends Controller {
  constructor(ctx) {
    super(ctx);

    this.UserCreateTransfer = {
      userName: {
        type: "string",
        required: true,
        allowEmpty: false,
        format: /^[a-zA-Z\u4E00-\u9FA5][a-zA-Z0-9\u4E00-\u9FA5_-]{1,15}$/,
      },
      email: { type: "email", required: true },
      password: {
        type: "string",
        required: true,
        format: /^.*(?=.{6,})(?=.*\d)(?=.*[a-zA-Z]).*$/,
      },
      phone: { type: "string", required: false, format: /^[0-9]{11}$/ },
    };

    this.UserUpdateTransfer = {
      mobile: { type: "string", required: true, allowEmpty: false },
      realName: {
        type: "string",
        required: true,
        allowEmpty: false,
        format: /^[\u2E80-\u9FFF]{2,6}$/,
      },
    };
  }

  async index() {
    const { ctx } = this;
    ctx.body = await ctx.model.User.find({});
  }
  async create() {
    const { ctx } = this;
    const { body } = ctx.request;
    ctx.validate(this.UserCreateTransfer);
    const res = await this.service.user.create(body);
    ctx.status = 201;
    ctx.body = { data: res };
  }
}

module.exports = UserController;
