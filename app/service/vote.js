"use strict";

const Service = require("egg").Service;
const { v1: uuidv1, v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

class VoteService extends Service {
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
    if (payload.proposeStart)
      payload.proposeStart = new Date(payload.proposeStart);
    if (payload.voteStart) payload.voteStart = new Date(payload.voteStart);
    if (payload.voteEnd) payload.voteEnd = new Date(payload.voteEnd);
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
    // is voter
    let isVoter = false;
    vote.voters.forEach((voter) => {
      if (voter.equals(_userId)) isVoter = true;
    });
    if (vote.owner !== _userId && !isVoter) ctx.throw(401);
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
      ctx.throw(401, "You can't leave because you are owner");
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
    if (vote.period === "end") ctx.throw(400, "投票流程已经结束");
    let nextPeriodIdx = periods.indexOf(vote.period) + 1;
    let realNext = periods[nextPeriodIdx];
    if (realNext !== next) ctx.throw(400, "时间设置冲突");
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
    if (payload.proposeStart)
      payload.proposeStart = new Date(payload.proposeStart);
    if (payload.voteStart) payload.voteStart = new Date(payload.voteStart);
    if (payload.voteEnd) payload.voteEnd = new Date(payload.voteEnd);
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
    const {
      title,
      detail,
      cover,
      proposeStart,
      voteStart,
      voteEnd,
      showProposer,
    } = payload;
    let newVote = await ctx.model.Vote.findByIdAndUpdate(
      _id,
      {
        title,
        detail,
        cover,
        proposeStart,
        voteStart,
        voteEnd,
        showProposer,
      },
      {
        new: true,
      }
    ).lean();
    console.log("newVote");
    newVote.period = await this.getPeriod(vote, new Date());
    console.log(newVote.period);
    console.log(newVote);
    return newVote;
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

  async deleteProposal(_id, payload) {
    // proposeId
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    let vote = await ctx.model.Vote.findById(_id).lean();
    // vote exist
    if (!vote) ctx.throw(404);
    // proposal validate
    const { proposalId } = payload;
    if (!proposalId) ctx.throw(400, "请输入提议ID");
    let proposal = await ctx.model.Vote.findOne({
      _id: _id,
      proposals: { $elemMatch: { _id: proposalId } },
    })
      .select({ proposals: { $elemMatch: { _id: proposalId } } })
      .lean();
    if (!proposal) ctx.throw(400, "不存在该提议");
    // auth
    if (
      vote.owner.toString() !== _userId &&
      proposal.proposals[0].proposer.toString() !== _userId
    )
      ctx.throw(401);
    // delete

    return ctx.model.Vote.findByIdAndUpdate(
      _id,
      {
        $pull: {
          proposals: {
            _id: proposalId,
          },
        },
      },
      { new: true }
    );
  }

  async vote(_id, payload) {
    // proposalIds + privacy
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
    // check multiChoice
    if (proposalIds.length === 0) {
      ctx.throw(400, "选择选项后再投票");
    } else if (!vote.multiChoice && proposalIds.length > 1) {
      ctx.throw(400, "投票不支持多选");
    }
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

  async hasVoted(_id) {
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
    // judge
    const alreadyVote = await ctx.model.Vote.find({
      _id: _id,
      "proposals.votes.supporter": _userId,
    });
    return alreadyVote.length > 0;
  }

  async getVotePeriod(_id) {
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
    return this.getPeriod(vote, new Date());
  }

  async share(_id, payload) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    let vote = await ctx.model.Vote.findById(_id).lean();
    // vote exist
    if (!vote) ctx.throw(404);
    // is owner
    if (!(vote.owner.toString() === _userId)) ctx.throw(401);

    // const expireAt = new Date(+new Date() + 24 * 60 * 60 * 1000);
    const { active = true } = payload;
    return ctx.model.Vote.findOneAndUpdate(
      { _id: _id },
      {
        $set: {
          "share.active": active,
        },
      },
      { new: true }
    );
  }

  async acceptShare(_id, payload) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);

    let vote = await ctx.model.Vote.findById(_id).lean();
    // vote exist
    if (!vote) ctx.throw(404);
    if (!vote.share.active) ctx.throw(401);
    const { uuid } = payload;
    // console.log(new Date(), " | ", vote.share.expireAt);
    console.log(uuid);
    console.log(vote);
    if (uuid && uuid !== vote.share.uuid) ctx.throw(400, "链接错误");
    if (uuid && uuid === vote.share.uuid) {
      let newVote = await ctx.model.Vote.findByIdAndUpdate(
        _id,
        { $addToSet: { voters: _userId } },
        { new: true }
      ).lean();
      newVote.period = await this.getPeriod(newVote, new Date());
      return newVote;
    }
    ctx.throw(500);
  }

  async resetShareId(_id) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    let vote = await ctx.model.Vote.findById(_id).lean();
    // vote exist
    if (!vote) ctx.throw(404);
    // is owner
    if (!(vote.owner.toString() === _userId)) ctx.throw(401);

    const uuid = uuidv4();
    // const expireAt = new Date(+new Date() + 24 * 60 * 60 * 1000);
    return await ctx.model.Vote.findOneAndUpdate(
      { _id: _id },
      {
        $set: {
          "share.uuid": uuid,
        },
      },
      { new: true }
    );
  }

  // common

  async checkTime(payload) {
    const { ctx } = this;
    const {
      proposeStart = undefined,
      voteStart = undefined,
      voteEnd = undefined,
    } = payload;
    // console.log("----------", proposeStart, " | ", voteStart, " | ", voteEnd);

    if (voteEnd) {
      if (!voteStart) ctx.throw(400, "时间设置冲突");
      if (voteEnd.getTime() < voteStart.getTime())
        ctx.throw(400, "时间设置冲突");
    }
    if (voteStart) {
      if (!proposeStart) ctx.throw(400, "时间设置冲突");
      if (voteStart.getTime() < proposeStart.getTime())
        ctx.throw(400, "时间设置冲突");
    }
  }

  async getPeriod(vote, now) {
    let period = undefined;
    // console.log(
    //   "----------",
    //   vote.proposeStart,
    //   " | ",
    //   vote.voteStart,
    //   " | ",
    //   vote.voteEnd
    // );
    console.log(now);
    if ((vote.proposeStart && now < vote.proposeStart) || !vote.proposeStart) {
      period = "notStarted";
    } else if ((vote.voteStart && now < vote.voteStart) || !vote.voteStart) {
      period = "proposing";
    } else if ((vote.voteEnd && now < vote.voteEnd) || !vote.voteEnd) {
      period = "voting";
    } else {
      period = "end";
    }
    return period;
  }
}

module.exports = VoteService;
