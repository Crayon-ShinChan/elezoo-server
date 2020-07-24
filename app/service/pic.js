"use strict";

const Service = require("egg").Service;
const sendToWormhole = require("stream-wormhole");
const toArray = require("stream-to-array");
const FormStream = require("formstream");
const upimg = require("upimg");

class PicService extends Service {
  async upload({ backup = false } = body, files) {
    const { ctx, service } = this;
    let res = { urlBackup: [] };
    // const _id = ctx.state.user.data._id;
    // let user = await service.user.find(_id);
    // if (!user) {
    //   ctx.throw(401);
    // }

    // https://unpkg.com/browse/upimg@0.5.0/
    await upimg.alibaba
      .upload(files[0].filepath)
      .then((json) => {
        console.log("ali:", json);
        if (("ali:", json.success)) {
          res.url = json.url;
        } else {
          ctx.throw(500, err, message);
        }
      })
      .catch((err) => {
        ctx.throw(500, err.message);
      });

    if (backup) {
      await upimg.jd.upload(files[0].filepath).then((json) => {
        console.log("baidu", json);
        if (json.success) {
          res.urlBackup.push(json.url);
        }
      });

      // await upimg.toutiao.upload(files[0].filepath).then((json) => {
      //   console.log("toutiao", json);
      //   if (json.success) {
      //     res.urlBackup.push(json.url);
      //   }
      // });
    }

    return res;
  }

  async uploadStream({ buffer, host = "ali" } = {}) {
    const { ctx } = this;
    let buf;
    let res;
    let stream;
    try {
      if (buffer) {
        buf = buffer;
      } else {
        stream = await ctx.getFileStream();
        const parts = await toArray(stream);
        // console.log("parts:", stream);
        buf = Buffer.concat(parts);
      }
      const form = new FormStream();
      if (host === "smms") {
        form.field("ssl", 1).field("format", "json");
        form.buffer("smfile", buf, encodeURIComponent(stream.filename));

        res = await ctx
          .curl("https://sm.ms/api/upload", {
            method: "POST",
            headers: form.headers(),
            stream: form,
            dataType: "json",
            timeout: 30000,
          })
          .then((res) => res.data.data);
      } else if (host === "sina") {
        const Cookie =
          "SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9Whh6mWpwR2axqXTa9nZYuUD5JpX5K-hUgL.Foq7S0nR1KzXeo52dJLoI7q7eh8bdNBt; _T_WM=83825571878; SUHB=08Jr5qv-U0CVFM; SCF=AsJMZ31gt79X0DDBkcIyoUNbJ0mbtUwgF1cfDPPRH4qj6erO0bkWmyMuQ4jKzxxja0DoITw2qUBiVoRqBphiZ8Y.; SUB=_2A25wgc0zDeRhGeBO7FoZ-SzIyTyIHXVTjdN7rDV6PUJbktANLVitkW1NRavuN4XDwYc8MU97OE3M1ERy4b-1vUBf";

        // weibo: asking for st
        const st = await ctx
          .curl("https://m.weibo.cn/api/config", {
            method: "GET",
            headers: {
              Cookie,
            },
            dataType: "json",
          })
          .then((res) => res.data.data.st);

        // upload
        form.buffer("pic", buf, "img.png");
        form.field("type", "json");
        form.field("st", st);

        res = await ctx
          .curl("https://m.weibo.cn/api/statuses/uploadPic", {
            method: "POST",
            headers: form.headers({
              Cookie,
              Origin: "https://m.weibo.cn",
              Referer: "https://m.weibo.cn/compose/",
            }),
            stream: form,
            dataType: "json",
            timeout: 30000,
          })
          .then((res) => `https://ws3.sinaimg.cn/large/${res.data.pic_id}.jpg`);
      } else if (host === "sina2") {
        // https://doc.yum6.cn/web/#/1?page_id=13
        res = await ctx
          .curl("https://api.yum6.cn/sinaimg.php?type=multipart", {
            method: "POST",
            headers: form.headers(),
            stream: form,
            dataType: "json",
            timeout: 30000,
          })
          .then((res) => `https://ww1.sinaimg.cn/large/${res.data.pid}.jpg`);
      } else if (host === "ali") {
        // https://unpkg.com/upimg@0.4.0/modules/alibaba.js
        form.buffer("file", buf, "img.png");
        form.field("name", "image.jpg");
        form.field("scene", "aeMessageCenterV2ImageRule");
        res = await ctx
          .curl("https://kfupload.alibaba.com/mupload", {
            method: "POST",
            headers: form.headers({
              "User-Agent":
                "iAliexpress/6.22.1 (iPhone; iOS 12.1.2; Scale/2.00)",
            }),
            stream: form,
            dataType: "json",
            timeout: 30000,
          })
          .then((res) => res.data.url);
      } else if (host === "ali2") {
        // https://api.uomg.com/doc-image.ali.html
        form.field("file", "multipart");
        form.buffer("Filedata", buf, "img.png");
        res = await ctx
          .curl("https://api.uomg.com/api/image.ali", {
            method: "POST",
            headers: form.headers(),
            stream: form,
            dataType: "json",
            timeout: 30000,
          })
          .then((res) => res.data.imgurl);
      }
    } catch (e) {
      stream && (await sendToWormhole(stream));
      throw e;
    }

    return res;
  }

  async convertToPicBed(src) {
    const { ctx } = this;
    const res = await ctx
      .curl(`https://api.yum6.cn/sinaimg.php?img=${src}`, {
        method: "GET",
        dataType: "json",
        timeout: 10000,
      })
      .then((res) => `https://ww1.sinaimg.cn/large/${res.data.pid}.jpg`);

    return res;
  }
}

module.exports = PicService;
