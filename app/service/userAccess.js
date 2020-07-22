// "use strict";

// const Service = require("egg").Service;

// class UserAccessService extends Service {
//   async login(payload) {
//     const { ctx, service } = this;
//     let result = await service.userAccess.loginByInfo(
//       { email: payload.account },
//       payload.password
//     );
//     if (result) return result;
//     result = await service.userAccess.loginByInfo(
//       { userName: payload.account },
//       payload.password
//     );
//     if (result) return result;
//     ctx.throw(401, "用户信息错误。");
//   }

//   async current() {
//     const { ctx, service } = this;
//     // ctx.state.user 可以提取到JWT编码的data
//     const _id = ctx.state.user.data._id;
//     let user = await service.user.find(_id);
//     if (!user) {
//       ctx.throw(404, "user is not found");
//     }
//     // delete user.password;
//     user.password = undefined;
//     return user;
//   }

//   async loginByInfo(account, password) {
//     const { ctx, service } = this;
//     const user = await ctx.model.User.findOne(account);
//     if (!user) {
//       return false;
//     }
//     const verifyPsw = await ctx.compare(password, user.password);
//     return verifyPsw
//       ? { token: await service.actionToken.apply(user._id) }
//       : false;
//   }
// }

// module.exports = UserAccessService;
