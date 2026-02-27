import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    package_id: { type: Number, required: true, unique: true, index: true },
    tenant_id: { type: Number, required: true, index: true },
    received_by_staff_id: { type: Number, default: null, index: true },
    tracking_no: { type: String, default: null },
    carrier: { type: String, default: null },
    sender_name: { type: String, default: null },
    current_status: {
      type: String,
      required: true,
      enum: ["ARRIVED", "PICKED_UP", "RETURNED"],
      default: "ARRIVED",
    },
    arrived_at: { type: Date, required: true, default: () => new Date() },
    picked_up_at: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.models.Package || mongoose.model("Package", packageSchema);
