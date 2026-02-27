import mongoose from "mongoose";

const packageStatusLogSchema = new mongoose.Schema(
  {
    package_id: { type: Number, required: true, index: true },
    updated_by_staff_id: { type: Number, default: null, index: true },
    status: {
      type: String,
      required: true,
      enum: ["ARRIVED", "PICKED_UP", "RETURNED"],
    },
    note: { type: String, default: "" },
    status_time: { type: Date, required: true, default: () => new Date(), index: true },
  },
  { timestamps: true, versionKey: false }
);

packageStatusLogSchema.index({ package_id: 1, status_time: -1 });

export default mongoose.models.PackageStatusLog || mongoose.model("PackageStatusLog", packageStatusLogSchema);
