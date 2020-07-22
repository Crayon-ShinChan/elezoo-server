// "use strict";

// const Controller = require("egg").Controller;

// const userLoginTransfer = {
//   account: { type: "string", required: true, allowEmpty: false },
//   password: { type: "string", required: true, allowEmpty: false },
// };

// class UserAccessController extends Controller {
//   //用户登陆
//   async login() {
//     const { ctx, service } = this;
//     // ctx.validate(userLoginTransfer);
//     const payload = ctx.request.body || {};
//     const res = await service.userAccess.login(payload);
//     ctx.helper.success({ ctx, res });
//   }

//   async current() {
//     const { ctx, service } = this;
//     const res = await service.userAccess.current();
//     // 设置响应内容和响应状态码
//     ctx.helper.success({ ctx, res });
//   }
// }

// module.exports = UserAccessController;
