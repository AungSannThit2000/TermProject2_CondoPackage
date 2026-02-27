import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    staff_id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, required: true, unique: true, index: true },
    full_name: { type: String, required: true, trim: true },
    phone: { type: String, default: null },
    email: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.models.Staff || mongoose.model("Staff", staffSchema);
