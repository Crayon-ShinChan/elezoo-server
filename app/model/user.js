module.exports = (app) => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const userSchema = new Schema({
    userName: {
      type: String,
      unique: true,
      required: true,
      //match: /^[a-zA-Z\u4E00-\u9FA5][a-zA-Z0-9\u4E00-\u9FA5_-]{1,15}$/,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      // match: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      unique: true,
      // match: /^[0-9]{11}$/
    },
    avatar: { type: String },
    avatarBackup: { type: Array },
    gender: { type: String },
    createdAt: { type: Date, default: Date.now },
  });

  return mongoose.model("User", userSchema, "users");
};
