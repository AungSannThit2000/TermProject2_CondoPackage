import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    user_id: { type: Number, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, trim: true, index: true },
    password_hash: { type: String, required: true },
    role: { type: String, required: true, enum: ["ADMIN", "OFFICER", "TENANT"] },
    status: { type: String, required: true, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
