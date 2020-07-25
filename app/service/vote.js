"use strict";

const Service = require("egg").Service;
var mongoose = require("mongoose");

class VoteController extends Service {
  async index(payload) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    if (!payload.hasOwnProperty("direct")) {
      payload.direct = {};
    }
    if (!payload.hasOwnProperty("indirect")) {
      return ctx.model.Vote.find({
        $or: [
          { owner: _userId, ...payload.direct },
          { voters: _userId, ...payload.direct },
        ],
      });
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
    const now = new Date();
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
    let res = await ctx.model.Vote.find(condition).lean();
    res.forEach((vote) => {
      service.vote.getPeriod(vote, now);
    });

    return res;
  }

  async create(payload) {
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
    return ctx.model.Vote.create(payload);
  }

  async show(_id) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);

    // let vote = await ctx.model.Vote.findById(_id).lean();
    let vote = await ctx.model.Vote.findById(_id).lean();
    console.log(vote);
    if (!vote) ctx.throw(404);
    vote = await this.getPeriod(vote, new Date());
    if (vote.owner != _userId && vote.voters.include(_userId)) ctx.throw(401);
    return vote;
  }

  async destroy(_id) {
    const { ctx, service } = this;
    const _userId = ctx.state.user.data._id;
    await service.user.checkUser(_userId);
    // check if own this vote
    const vote = await ctx.model.Vote.findById(_id);
    if (!vote) ctx.throw(404);
    if (vote.owner !== "_userId") ctx.throw(401);
    return ctx.model.User.findByIdAndRemove(_id);
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
    if (!vote.owner.toString() === _userId) ctx.throw(401);
    // update, invitee is a list
    return ctx.model.Vote.findByIdAndUpdate(
      _id,
      {
        $addToSet: { voters: { $each: invitee } },
      },
      { new: true }
    );
  }

  async updatePeriod() {
    
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
    if (
      (vote.hasOwnProperty("proposeStart") && now < vote.proposeStart) ||
      !vote.hasOwnProperty("proposeStart")
    ) {
      vote.period = "notStarted";
    } else if (
      (vote.hasOwnProperty("voteStart") && now < vote.voteStart) ||
      !vote.hasOwnProperty("voteStart")
    ) {
      vote.period = "proposing";
    } else if (
      (vote.hasOwnProperty("voteEnd") && now < vote.voteEnd) ||
      !vote.hasOwnProperty("voteEnd")
    ) {
      vote.period = "voting";
    } else {
      vote.period = "end";
    }
    return vote;
  }
}

module.exports = VoteController;
