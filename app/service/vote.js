"use strict";

const Service = require("egg").Service;
var mongoose = require("mongoose");

class VoteController extends Service {
  async index(payload) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    const now = new Date();
    await service.user.checkUser(_userId);
    if (!payload.hasOwnProperty("direct")) {
      payload.direct = {};
    }
    if (!payload.hasOwnProperty("indirect")) {
      let items = await ctx.model.Vote.find({
        $or: [
          { owner: _userId, ...payload.direct },
          { voters: _userId, ...payload.direct },
        ],
      }).lean();
      for (let idx = 0; idx < items.length; idx++) {
        items[idx].period = await service.vote.getPeriod(items[idx], now);
        let ownerInfo = await service.user.show(items[idx].owner);
        items[idx].ownerAvatar = ownerInfo.avatar;
      }
      return items;
    }

    const condition = {
      $and: [
        {
          $or: [
            { owner: _userId, ...payload.direct },
            { voters: _userId, ...payload.direct },
          ],
        },
      ],
    };
    const subCdtn = condition["$and"];
    if (
      payload.indirect.hasOwnProperty("roles") &&
      payload.indirect.roles.length > 0
    ) {
      subCdtn.push({ $or: [] });
      payload.indirect.roles.forEach((role) => {
        if (role === "owner") {
          subCdtn[subCdtn.length - 1]["$or"].push({ owner: _userId });
        } else if (role === "notOwner") {
          subCdtn[subCdtn.length - 1]["$or"].push({ owner: { $ne: _userId } });
        }
      });
    }
    if (
      payload.indirect.hasOwnProperty("periods") &&
      payload.indirect.periods.length > 0
    ) {
      subCdtn.push({ $or: [] });
      payload.indirect.periods.forEach((period) => {
        if (period === "notStarted") {
          subCdtn[subCdtn.length - 1]["$or"].push({
            $or: [{ proposeStart: null }, { proposeStart: { $gt: now } }],
          });
        } else if (period === "proposing") {
          subCdtn[subCdtn.length - 1]["$or"].push({
            $and: [
              { proposeStart: { $lt: now } },
              { $or: [{ voteStart: null }, { voteStart: { $gt: now } }] },
            ],
          });
        } else if (period === "voting") {
          subCdtn[subCdtn.length - 1]["$or"].push({
            $and: [
              { voteStart: { $lt: now } },
              { $or: [{ voteEnd: null }, { voteEnd: { $gt: now } }] },
            ],
          });
        } else if (period === "end") {
          subCdtn[subCdtn.length - 1]["$or"].push({ voteEnd: { $lt: now } });
        }
      });
    }

    // the document object you get back from mongoose doesn't access the properties directly. It uses the prototype chain hence hasOwnProperty returning false (I am simplifying this greatly).
    // https://stackoverflow.com/questions/30923378/why-does-mongoose-models-hasownproperty-return-false-when-property-does-exist
    // https://stackoverflow.com/questions/9952649/convert-mongoose-docs-to-json
    let items = await ctx.model.Vote.find(condition).lean();
    for (let idx = 0; idx < items.length; idx++) {
      items[idx].period = await service.vote.getPeriod(items[idx], now);
      let ownerInfo = await service.user.show(items[idx].owner);
      items[idx].ownerAvatar = ownerInfo.avatar;
    }
    return items;
  }

  async create(payload) {
    // payload: title, voter, detail, cover, proposeStart, voteStart, voteEnd, privacyOption, showProposer
    const { ctx, service } = this;
    // console.log("ctx.state:", ctx.state);
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    await this.checkTime(payload);
    payload.owner = _userId;
    if (payload.hasOwnProperty("voters")) {
      payload.voters.unshift(_userId);
    } else {
      payload.voters = [_userId];
    }
    console.log("payload", payload);
    return ctx.model.Vote.create(payload);
  }

  async show(_id) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);

    // let vote = await ctx.model.Vote.findById(_id).lean();
    let vote = await ctx.model.Vote.findById(_id).lean();
    if (!vote) ctx.throw(404);
    if (vote.owner != _userId && vote.voters.include(_userId)) ctx.throw(401);
    vote.period = await this.getPeriod(vote, new Date());
    if (vote.privacyOption === "anonymity") {
      vote.proposals.forEach((proposal) => {
        delete proposal.proposer;
        proposal.votes.forEach((vote) => {
          delete vote.supporter;
        });
      });
    } else if (vote.privacyOption === "free") {
      vote.proposals.forEach((proposal) => {
        if (proposal.privacy === "anonymity") delete proposal.proposer;
        proposal.votes.forEach((vote) => {
          if (vote.privacy === "anonymity") delete vote.supporter;
        });
      });
    }
    return vote;
  }

  async destroy(_id) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    // check if own this vote
    const vote = await ctx.model.Vote.findById(_id);
    if (!vote) ctx.throw(404);
    if (vote.owner.toString() !== _userId) ctx.throw(401);
    return ctx.model.Vote.findByIdAndRemove(_id);
  }

  async leave(_id) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    const vote = await ctx.model.Vote.findById(_id).lean();
    // vote exist
    if (!vote) ctx.throw(404);
    // own vote
    if (vote.owner.toString() === _userId)
      ctx.throw(401, "You can leave because you are owner");
    // is voters
    const voters = [];
    vote.voters.forEach((voter) => {
      voters.push(voter.toString());
    });
    if (!voters.includes(_userId)) ctx.throw(401);
    // update
    return ctx.model.Vote.findByIdAndUpdate(
      _id,
      {
        $pull: { voters: _userId },
      },
      { new: true }
    );
  }

  async invite(_id, { invitee = [] }) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    const vote = await ctx.model.Vote.findById(_id).lean();
    // vote exist
    if (!vote) ctx.throw(404);
    // own vote
    if (!(vote.owner.toString() === _userId)) ctx.throw(401);
    // update, invitee is a list
    return ctx.model.Vote.findByIdAndUpdate(
      _id,
      {
        $addToSet: { voters: { $each: invitee } },
      },
      { new: true }
    );
  }

  async nextPeriod(_id, { next = undefined } = {}) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    const now = new Date();
    await service.user.checkUser(_userId);
    let vote = await ctx.model.Vote.findById(_id).lean();
    // vote exist
    if (!vote) ctx.throw(404);
    // own vote
    if (vote.owner.toString() !== _userId) ctx.throw(401);
    // has next
    if (!next) ctx.throw(400, "没有指定下一阶段");
    // check time
    await this.checkTime(vote);

    const periods = ["notStarted", "proposing", "voting", "end"];
    const times = ["createAt", "proposeStart", "voteStart", "voteEnd"];
    // find next
    vote.period = await this.getPeriod(vote, now);
    if (vote.period === "end") ctx.throw(403, "投票流程已经结束");
    let nextPeriodIdx = periods.indexOf(vote.period) + 1;
    let realNext = periods[nextPeriodIdx];
    if (realNext !== next) ctx.throw(400, "时间设置冲突");
    // let shift = false;
    // let conflict = false;
    // for (let idx = 0; idx < periods.length; idx++) {
    //   if (next === periods[idx]) {
    //     shift = true;
    //     if (vote.hasOwnProperty(times[idx])) {
    //       conflict = true;
    //       break;
    //     }
    //     continue;
    //   }
    //   if (shift) {
    //     if (vote.hasOwnProperty(times[idx])) {
    //       conflict = true;
    //       break;
    //     }
    //   } else {
    //     if (!vote.hasOwnProperty(times[idx])) {
    //       conflict = true;
    //       break;
    //     }
    //   }
    // }
    // if (conflict) ctx.throw(403, "时间设置冲突");
    return ctx.model.Vote.findByIdAndUpdate(
      _id,
      {
        [times[nextPeriodIdx]]: now,
      },
      { new: true }
    );
  }

  async updateBasic(_id, payload) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    let vote = await ctx.model.Vote.findById(_id).lean();
    // vote exist
    if (!vote) ctx.throw(404);
    // own vote
    if (!(vote.owner.toString() === _userId)) ctx.throw(401);
    vote.period = await this.getPeriod(vote, new Date());
    // process payload
    if (payload.hasOwnProperty("proposeStart"))
      payload.voteStart = new Date(payload.voteStart);
    if (payload.hasOwnProperty("voteStart"))
      payload.voteStart = new Date(payload.voteStart);
    if (payload.hasOwnProperty("voteEnd"))
      payload.voteEnd = new Date(payload.voteEnd);
    // https://stackoverflow.com/questions/7244513/javascript-date-comparisons-dont-equal#:~:text=5%20Answers&text=When%20you%20use,type%2C%20so%20it%20returns%20false.
    if (vote.period === "end" || vote.period === "voting") {
      if (
        payload.hasOwnProperty("voteStart") &&
        vote.hasOwnProperty("voteStart") &&
        payload.voteStart.getTime() !== vote.voteStart.getTime()
      )
        ctx.throw(403, "不能更改前置时间");
      if (
        payload.hasOwnProperty("proposeStart") &&
        vote.hasOwnProperty("proposeStart") &&
        payload.proposeStart.getTime() !== vote.proposeStart.getTime()
      )
        ctx.throw(403, "不能更改前置时间");
    } else if (vote.period === "proposing") {
      if (
        payload.hasOwnProperty("proposeStart") &&
        vote.hasOwnProperty("proposeStart") &&
        payload.proposeStart.getTime() !== vote.proposeStart.getTime()
      )
        ctx.throw(403, "不能更改前置时间");
    }
    // console.log({ ...vote, ...payload });
    await this.checkTime({ ...vote, ...payload });
    return ctx.model.Vote.findByIdAndUpdate(_id, payload, {
      new: true,
    });
  }

  async propose(_id, payload) {
    // content + privacy
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    let vote = await ctx.model.Vote.findById(_id).lean();
    // vote exist
    if (!vote) ctx.throw(404);
    // is voters
    const voters = [];
    vote.voters.forEach((voter) => {
      voters.push(voter.toString());
    });
    if (!voters.includes(_userId)) ctx.throw(401);
    // proposing period validator
    const now = new Date();
    vote.period = await this.getPeriod(vote, now);
    if (vote.period !== "proposing") ctx.throw(403, "不在提议阶段");
    // content validator
    let { content, privacy = "realName" } = payload;
    const proposals = await ctx.model.Vote.find({
      _id: _id,
      proposals: { $elemMatch: { content } },
    });
    if (proposals.length > 0) ctx.throw(403, "存在相同提议");

    if (vote.privacyOption !== "free" && vote.privacyOption !== privacy)
      ctx.throw(403, "隐私设置不被允许");

    return ctx.model.Vote.findByIdAndUpdate(
      _id,
      {
        $push: {
          proposals: {
            content,
            proposer: _userId,
            privacy,
          },
        },
      },
      {
        new: true,
        // because this is update method, it won't use validator automatically
        // unlike create method, required fields may already exist, so run validator explicitly
        runValidators: true,
      }
    );
  }

  async vote(_id, payload) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    let vote = await ctx.model.Vote.findById(_id).lean();
    // vote exist
    if (!vote) ctx.throw(404);
    // is voters
    const voters = [];
    vote.voters.forEach((voter) => {
      voters.push(voter.toString());
    });
    if (!voters.includes(_userId)) ctx.throw(401);
    // voting period validator
    const now = new Date();
    vote.period = await this.getPeriod(vote, now);
    if (vote.period !== "voting") ctx.throw(403, "不在投票阶段");
    // already vote
    const alreadyVote = await ctx.model.Vote.find({
      _id: _id,
      "proposals.votes.supporter": _userId,
    });
    if (alreadyVote.length > 0) ctx.throw(403, "已经投过票了");
    // vote
    let { proposalIds = [], privacy = "realName" } = payload;
    if (vote.privacyOption !== "free") privacy = vote.privacyOption;
    // https://stackoverflow.com/questions/10432677/update-field-in-exact-element-array-in-mongodb
    for (let idx = 0; idx < proposalIds.length; idx++) {
      await ctx.model.Vote.findOneAndUpdate(
        { _id: _id, "proposals._id": proposalIds[idx] },
        {
          $push: {
            "proposals.$.votes": {
              supporter: _userId,
              privacy,
            },
          },
        },
        { runValidators: true }
      );
    }
    return ctx.model.Vote.findById(_id);
  }

  // common

  async checkTime(payload) {
    const { ctx } = this;
    const {
      proposeStart = undefined,
      voteStart = undefined,
      voteEnd = undefined,
    } = payload;

    if (voteEnd) {
      if (!(voteStart && proposeStart)) ctx.throw(403, "时间设置冲突");
      if (voteEnd < voteStart) ctx.throw(403, "时间设置冲突");
    } else if (voteStart) {
      if (!proposeStart) ctx.throw(403, "时间设置冲突");
      if (voteStart < proposeStart) ctx.throw(403, "时间设置冲突");
    }
  }

  async getPeriod(vote, now) {
    // console.log(vote);
    // console.log(now.getTime());
    let period = undefined;
    if ((vote.proposeStart && now < vote.proposeStart) || !vote.proposeStart) {
      // console.log(now, " | ", vote.proposeStart);
      // console.log("notStarted");
      period = "notStarted";
    } else if ((vote.voteStart && now < vote.voteStart) || !vote.voteStart) {
      period = "proposing";
    } else if ((vote.voteEnd && now < vote.voteEnd) || !vote.voteEnd) {
      period = "voting";
    } else {
      period = "end";
    }
    // console.log(period);
    return period;
  }
}

module.exports = VoteController;
