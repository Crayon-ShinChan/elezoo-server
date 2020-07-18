"use strict";

const Controller = require("egg").Controller;

class UserController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = await ctx.model.User.find({});
  }
  async signUp() {
    const { ctx } = this;
    const users = await ctx.model.User.find({
      email: ctx.request.body.email,
    });
    if (users.length >= 1) {
      ctx.body = "Mail exists";
    } else {
      const hashPass = await ctx.genHash(ctx.request.body.password);
      const newUser = new ctx.model.User({
        ...ctx.request.body,
        password: hashPass,
      });
      await newUser.save().then((result) => {
        console.log(result);
        ctx.body = result;
      });
    }
  }
}

module.exports = UserController;
