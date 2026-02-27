import mongoose from "mongoose";

const buildingSchema = new mongoose.Schema(
  {
    building_id: { type: Number, required: true, unique: true, index: true },
    building_code: { type: String, required: true, unique: true, trim: true },
    building_name: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.models.Building || mongoose.model("Building", buildingSchema);
