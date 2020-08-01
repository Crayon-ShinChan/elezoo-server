"use strict";

const Service = require("egg").Service;
const Avatar = require("avatar-builder");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const identicon = require("identicon");
const fs = require("fs");
const FormStream = require("formstream");

// create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: "smtpdm.aliyun.com",
  port: 465,
  secureConnection: true, // use SSL, the port is 465
  auth: {
    user: "noreply@elezoo.top", // user name
    pass: "ThisisElezoo2020", // password
  },
});

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

    // https://www.npmjs.com/package/identicon
    // const buffer = identicon.generateSync({ id: payload.userName, size: 160 });
    // const form = new FormStream();
    // form.buffer("image", buffer, "image.png");

    // https://www.npmjs.com/package/avatar-builder
    // const avatar = Avatar.catBuilder(128);
    const avatar = Avatar.builder(
      Avatar.Image.compose(
        Avatar.Image.randomFillStyle(),
        Avatar.Image.longShadow(
          Avatar.Image.margin(Avatar.Image.cat(), 20)
          // {
          //   blur: 5,
          //   offsetX: 2.5,
          //   offsetY: -2.5,
          //   color: "rgba(0,0,0,0.75)",
          // }
        )
      ),
      128,
      128
    );
    const buffer = await avatar.create(payload.userName);

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
    const { userName, email, phone } = payload;
    if (userName && userName !== user.userName) {
      const anotherUser = await ctx.model.User.findOne({ userName });
      if (anotherUser) ctx.throw(409, "用户名已存在");
    }
    if (email && email !== user.email) {
      const anotherUser = await ctx.model.User.findOne({ email });
      if (anotherUser) ctx.throw(409, "邮箱已存在");
    }
    if (phone && phone !== user.phone) {
      const anotherUser = await ctx.model.User.findOne({ phone });
      if (anotherUser) ctx.throw(409, "手机号码已存在");
    }
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

  async forget(email) {
    const { ctx } = this;
    const user = await ctx.model.User.findOne({ email: email });
    if (!user) ctx.throw(500); // 防止 email 泄漏

    const uuid = uuidv4();
    const mailOptions = {
      from: "Elezoo<noreply@elezoo.top>", // sender address mailfrom must be same with the user
      to: email, // list of receivers
      subject: "[Elezoo] Please reset your password", // Subject line
      // text: `We heard that you lost your Elezoo password. Sorry about that!`, // plaintext body
      html: `<div>We heard that you lost your Elezoo password. Sorry about that!</div><br/><br/> \
      <div>But don’t worry! You can use the following link to reset your password:</div><br/><br/> \
      <a href='http://localhost:3333/#/user/reset/${user._id}?uuid=${uuid}'>http://localhost:3333/#/user/reset/${user._id}?uuid=${uuid}</a> <br/><br/><br/> \
      <div>If you don’t use this link within 3 hours, it will expire.</div><br/><br/><br/><br/> \
      <div>Thanks,</div><br/><div>The Elezoo Team</div>`,
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return ctx.throw(500, "邮件发送失败");
      }
      console.log("Message sent: " + info.response);
    });
    return ctx.model.User.findOneAndUpdate(
      { email: email },
      {
        reset: {
          uuid,
          expireAt: new Date(+new Date() + 3 * 60 * 60 * 1000),
        },
      },
      { new: true }
    );
  }

  async reset(_id, { uuid, password } = {}) {
    const { ctx } = this;
    const user = await this.find(_id);
    if (!user) ctx.throw(404, "user not found");
    if (
      user.reset &&
      new Date(user.reset.expireAt).getTime() < new Date().getTime()
    )
      ctx.throw(401);
    if (user.reset && uuid && uuid === user.reset.uuid) {
      const newPassword = await ctx.genHash(password);
      return ctx.model.User.findByIdAndUpdate(
        _id,
        { password: newPassword },
        { new: true }
      );
    }
    ctx.throw(400);
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
