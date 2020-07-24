"use strict";

const Controller = require("egg").Controller;

class PicController extends Controller {
  // file 模式上传文件
  async upload() {
    const { ctx, service } = this;
    // 注意我们开了 file 模式处理 form-data，而不是 stream 模式
    // https://eggjs.org/zh-cn/basics/controller.html#%E8%8E%B7%E5%8F%96%E4%B8%8A%E4%BC%A0%E7%9A%84%E6%96%87%E4%BB%B6
    const body = ctx.request.body;
    const files = ctx.request.files;
    // console.log(body);
    // console.log(files);
    const res = await service.pic.upload(body, files);
    console.log(res);
    ctx.helper.success({ ctx, code: 201, res });
  }

  // stream 模式上传文件 by Songkeys
  async uploadStream() {
    const { ctx, service } = this;
    const res = await service.pic.uploadStream();
    ctx.status = 201;
    ctx.body = { data: res };
  }
}

module.exports = PicController;
