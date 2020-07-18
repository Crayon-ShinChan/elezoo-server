"use strict";

const Controller = require("egg").Controller;

const userCreateTransfer = {
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

class UserController extends Controller {
  constructor(ctx) {
    super(ctx);

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
    const { ctx, service } = this;
    const res = await service.user.index();
    ctx.helper.success({ ctx, res });
  }

  // 获取单个用户
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const res = await service.user.show(id);
    ctx.helper.success({ ctx, res });
  }

  // 创建用户
  async create() {
    const { ctx, service } = this;
    const { body } = ctx.request;
    ctx.validate(userCreateTransfer);
    const res = await service.user.create(body);
    // ctx.status = 201;
    // ctx.body = { data: res };
    ctx.helper.success({ ctx, code: 201, res });
  }
}

module.exports = UserController;
