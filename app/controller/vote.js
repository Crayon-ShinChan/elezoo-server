"use strict";

const Controller = require("egg").Controller;

class VoteController extends Controller {
  async index() {
    const { ctx, service } = this;
    const payload = ctx.request.body;
    const res = await service.vote.index(payload);
    ctx.helper.success({ ctx, res });
  }

  async create() {
    const { ctx, service } = this;
    const payload = ctx.request.body;
    const res = await service.vote.create(payload);
    ctx.helper.success({ ctx, code: 201, res });
  }

  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const res = await service.vote.show(id);
    ctx.helper.success({ ctx, res });
  }

  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const res = await service.vote.destroy(id);
    ctx.helper.success({ ctx, code: 204, res });
  }

  async leave() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const res = await service.vote.leave(id);
    ctx.helper.success({ ctx, code: 201, res });
  }

  async invite() {
    const { ctx, service } = this;
    const payload = ctx.request.body;
    const { id } = ctx.params;
    const res = await service.vote.invite(id, payload);
    ctx.helper.success({ ctx, code: 201, res });
  }

  async nextPeriod() {
    const { ctx, service } = this;
    const payload = ctx.request.body;
    const { id } = ctx.params;
    const res = await service.vote.nextPeriod(id, payload);
    ctx.helper.success({ ctx, code: 201, res });
  }

  async updateBasic() {
    const { ctx, service } = this;
    const payload = ctx.request.body;
    const { id } = ctx.params;
    const res = await service.vote.updateBasic(id, payload);
    ctx.helper.success({ ctx, code: 201, res });
  }

  async propose() {
    const { ctx, service } = this;
    const payload = ctx.request.body;
    const { id } = ctx.params;
    const res = await service.vote.propose(id, payload);
    ctx.helper.success({ ctx, code: 201, res });
  }

  async vote() {
    const { ctx, service } = this;
    const payload = ctx.request.body;
    const { id } = ctx.params;
    const res = await service.vote.vote(id, payload);
    ctx.helper.success({ ctx, code: 201, res });
  }

  async hasVoted() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const res = await service.vote.hasVoted(id);
    ctx.helper.success({ ctx, res });
  }

  async getVotePeriod() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const res = await service.vote.getVotePeriod(id);
    ctx.helper.success({ ctx, res });
  }

  async deleteProposal() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const payload = ctx.request.body;
    const res = await service.vote.deleteProposal(id, payload);
    ctx.helper.success({ ctx, code: 204, res });
  }
}

module.exports = VoteController;
