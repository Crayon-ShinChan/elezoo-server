"use strict";

const Controller = require("egg").Controller;

const userCreateTransfer = {
  userName: {
    type: "string",
    required: true,
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

const userUpdateTransfer = Object.fromEntries(
  Object.entries(userCreateTransfer).map((element) => {
    element[1].required = false;
    return element;
  })
);

const userLoginTransfer = {
  account: { type: "string", required: true, allowEmpty: false },
  password: { type: "string", required: true, allowEmpty: false },
};

const userUpdatePasswordTransfer = {
  oldPassword: userCreateTransfer.password,
  password: userCreateTransfer.password,
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
    // console.log("request:", ctx.request);
    // console.log("request:", ctx.request.body);
    const payload = ctx.request.body;
    const res = await service.user.create(payload);
    // ctx.status = 201;
    // ctx.body = { data: res };
    ctx.helper.success({ ctx, code: 201, res });
  }

  // 用户登录
  async login() {
    const { ctx, service } = this;
    ctx.validate(userLoginTransfer);
    const payload = ctx.request.body || {};
    const res = await service.user.login(payload);
    ctx.helper.success({ ctx, res });
  }

  // 获取当前用户
  async current() {
    const { ctx, service } = this;
    const res = await service.user.current();
    // 设置响应内容和响应状态码
    ctx.helper.success({ ctx, res });
  }

  //更新用户基础信息
  async update() {
    const { ctx, service } = this;
    // const { id } = ctx.params;
    ctx.validate(userUpdateTransfer);
    const payload = ctx.request.body;
    const res = await service.user.update(payload);
    ctx.helper.success({ ctx, code: 201, res });
  }

  //更新用户密码
  async updatePassword() {
    const { ctx, service } = this;
    console.log(userUpdatePasswordTransfer);
    ctx.validate(userUpdatePasswordTransfer);
    const payload = ctx.request.body;
    const res = await service.user.updatePassword(payload);
    ctx.helper.success({ ctx, code: 201, res });
  }

  //删除用户
  async destroy() {
    const { ctx, service } = this;
    const { password } = ctx.request.body;
    const res = await service.user.destroy(password);
    ctx.helper.success({ ctx, res });
  }

  // 生成找回密码链接
  async forget() {
    const { ctx, service } = this;
    const { email } = ctx.request.body;
    const res = await service.user.forget(email);
    ctx.helper.success({ ctx, res });
  }

  // 修改密码
  async reset() {
    const { ctx, service } = this;
    const { uuid, password } = ctx.request.body;
    const { id } = ctx.params;
    const res = await service.user.reset(id, { uuid, password });
    ctx.helper.success({ ctx, res });
  }
}

module.exports = UserController;
