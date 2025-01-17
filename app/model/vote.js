const { v4: uuidv4 } = require("uuid");

module.exports = (app) => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const proposalSchema = new Schema({
    content: { type: String, required: true }, // unique for a single vote or all?
    proposer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    privacy: { type: String, required: true },
    createAt: { type: Date, required: true, default: Date.now },
    votes: [
      {
        supporter: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
        privacy: { type: String, required: true },
        createAt: { type: Date, required: true, default: Date.now },
      },
    ],
  });

  const voteSchema = new Schema({
    title: { type: String, required: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    detail: { type: String },
    cover: { type: String },
    privacyOption: { type: String, required: true, default: "realName" },
    showProposer: { type: Boolean, required: true, default: false },
    multiChoice: { type: Boolean, required: true, default: true },
    createAt: { type: Date, required: true, default: Date.now },
    proposeStart: { type: Date },
    voteStart: { type: Date },
    voteEnd: { type: Date },
    voters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    proposals: [proposalSchema],
    share: {
      uuid: { type: String, required: true, default: uuidv4 },
      active: { type: Boolean, required: true, default: true },
      // expireAt: {
      //   type: Date,
      //   default: () => new Date(+new Date() + 24 * 60 * 60 * 1000),
      // },
    },
  });

  return mongoose.model("Vote", voteSchema, "votes");
};
