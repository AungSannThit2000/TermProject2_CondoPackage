import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    tenant_id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, required: true, unique: true, index: true },
    building_id: { type: Number, required: true, index: true },
    room_no: { type: String, required: true, trim: true },
    full_name: { type: String, required: true, trim: true },
    phone: { type: String, default: null },
    email: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.models.Tenant || mongoose.model("Tenant", tenantSchema);
