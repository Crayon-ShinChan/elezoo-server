module.exports = (app) => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const userSchema = new Schema({
    email: { type: String },
    phone: { type: String },
    nickname: { type: String },
    avatar: { type: String },
    password: { type: String },
    gender: { type: String },
  });

  return mongoose.model("User", userSchema, "users");
};
