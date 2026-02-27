import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    building_id: { type: Number, required: true, index: true },
    room_no: { type: String, required: true, trim: true },
    floor: { type: Number, default: null },
    status: { type: String, required: true, default: "ACTIVE" },
  },
  { timestamps: true, versionKey: false }
);

roomSchema.index({ building_id: 1, room_no: 1 }, { unique: true });

export default mongoose.models.Room || mongoose.model("Room", roomSchema);
