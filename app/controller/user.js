"use strict";

const Controller = require("egg").Controller;

const userCreateTransfer = {
  userName: {
    type: "string",
    required: true,
    allowEmpty: false,
    format: /^[a-zA-Z\u4E00-\u9FA5][a-zA-Z0-9\u4E00-\u9FA5_-]{1,14}$/,
  },
  email: { type: "email", required: true },
  password: {
    type: "string",
    required: true,
    format: /^.*(?=.{6,})(?=.*\d)(?=.*[a-zA-Z]).*$/,
  },
  phone: { type: "string", required: false, format: /^[0-9]{11}$/ },
};

const userUpdateTransfer = {
  userName: {
    type: "string",
    required: false,
    allowEmpty: false,
    format: /^[a-zA-Z\u4E00-\u9FA5][a-zA-Z0-9\u4E00-\u9FA5_-]{1,14}$/,
  },
  email: { type: "email", required: false },
  password: {
    type: "string",
    required: false,
    format: /^.*(?=.{6,})(?=.*\d)(?=.*[a-zA-Z]).*$/,
  },
  phone: { type: "string", required: false, format: /^[0-9]{11}$/ },
};

class UserController extends Controller {
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
    ctx.validate(userCreateTransfer);
    const payload = ctx.request.body;
    const res = await service.user.create(payload);
    // ctx.status = 201;
    // ctx.body = { data: res };
    ctx.helper.success({ ctx, code: 201, res });
  }

  //更新用户
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    ctx.validate(userUpdateTransfer);
    const payload = ctx.request.body;
    const res = await service.user.update(id, payload);
    ctx.helper.success({ ctx, code: 201, res });
  }

  //删除用户
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const res = await service.user.destroy(id);
    ctx.helper.success({ ctx, res });
  }
}

module.exports = UserController;
