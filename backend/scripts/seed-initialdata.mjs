import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const now = Date.now();
const daysAgo = (days) => new Date(now - days * 24 * 60 * 60 * 1000);
const ts = (obj) => ({ ...obj, createdAt: new Date(), updatedAt: new Date() });

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = [
    "packagestatuslogs",
    "packages",
    "tenants",
    "staffs",
    "rooms",
    "buildings",
    "users",
    "counters",
  ];

  for (const name of collections) {
    await db.collection(name).deleteMany({});
  }

  // Reset legacy indexes/doc shape on counters from older schema versions.
  try {
    await db.collection("counters").drop();
  } catch {}

  await db.collection("buildings").insertMany([
    ts({ building_id: 1, building_code: "A", building_name: "Building A" }),
    ts({ building_id: 2, building_code: "B", building_name: "Building B" }),
  ]);

  await db.collection("rooms").insertMany([
    ts({ building_id: 1, room_no: "101", floor: 1, status: "ACTIVE" }),
    ts({ building_id: 1, room_no: "102", floor: 1, status: "ACTIVE" }),
    ts({ building_id: 2, room_no: "201", floor: 2, status: "ACTIVE" }),
    ts({ building_id: 2, room_no: "202", floor: 2, status: "ACTIVE" }),
  ]);

  await db.collection("users").insertMany([
    ts({ user_id: 1, username: "admin", password_hash: "admin", role: "ADMIN", status: "ACTIVE" }),
    ts({
      user_id: 2,
      username: "officer",
      password_hash: "officer",
      role: "OFFICER",
      status: "ACTIVE",
    }),
    ts({ user_id: 3, username: "tenant1", password_hash: "tenant", role: "TENANT", status: "ACTIVE" }),
    ts({ user_id: 4, username: "tenant2", password_hash: "tenant", role: "TENANT", status: "ACTIVE" }),
  ]);

  await db.collection("staffs").insertMany([
    ts({
      staff_id: 1,
      user_id: 1,
      full_name: "Admin User",
      phone: "0999000001",
      email: "admin@example.com",
    }),
    ts({
      staff_id: 2,
      user_id: 2,
      full_name: "Officer User",
      phone: "0999000002",
      email: "officer@example.com",
    }),
  ]);

  await db.collection("tenants").insertMany([
    ts({
      tenant_id: 1,
      user_id: 3,
      building_id: 1,
      room_no: "101",
      full_name: "Aung Sann Thit",
      phone: "0999000003",
      email: "tenant1@example.com",
    }),
    ts({
      tenant_id: 2,
      user_id: 4,
      building_id: 1,
      room_no: "102",
      full_name: "May Thu Chit",
      phone: "0999000004",
      email: "tenant2@example.com",
    }),
  ]);

  await db.collection("packages").insertMany([
    ts({
      package_id: 1,
      tenant_id: 1,
      received_by_staff_id: 2,
      tracking_no: "TRACK-ARR-1",
      carrier: "DHL",
      sender_name: "Shop A",
      arrived_at: daysAgo(1),
      current_status: "ARRIVED",
      picked_up_at: null,
    }),
    ts({
      package_id: 2,
      tenant_id: 1,
      received_by_staff_id: 2,
      tracking_no: "TRACK-PICK-1",
      carrier: "FedEx",
      sender_name: "Shop B",
      arrived_at: daysAgo(5),
      current_status: "PICKED_UP",
      picked_up_at: daysAgo(2),
    }),
    ts({
      package_id: 3,
      tenant_id: 2,
      received_by_staff_id: 2,
      tracking_no: "TRACK-RET-1",
      carrier: "UPS",
      sender_name: "Shop C",
      arrived_at: daysAgo(10),
      current_status: "RETURNED",
      picked_up_at: null,
    }),
  ]);

  await db.collection("packagestatuslogs").insertMany([
    ts({
      package_id: 1,
      updated_by_staff_id: 2,
      status: "ARRIVED",
      note: "Seed: awaiting pickup",
      status_time: daysAgo(1),
    }),
    ts({
      package_id: 2,
      updated_by_staff_id: 2,
      status: "ARRIVED",
      note: "Seed: delivered earlier",
      status_time: daysAgo(5),
    }),
    ts({
      package_id: 2,
      updated_by_staff_id: 2,
      status: "PICKED_UP",
      note: "Seed: collected by tenant",
      status_time: daysAgo(2),
    }),
    ts({
      package_id: 3,
      updated_by_staff_id: 2,
      status: "ARRIVED",
      note: "Seed: later returned to sender",
      status_time: daysAgo(10),
    }),
    ts({
      package_id: 3,
      updated_by_staff_id: 2,
      status: "RETURNED",
      note: "Seed: carrier returned to depot",
      status_time: daysAgo(1),
    }),
  ]);

  const counters = [
    { _id: "building_id", seq: 2 },
    { _id: "user_id", seq: 4 },
    { _id: "staff_id", seq: 2 },
    { _id: "tenant_id", seq: 2 },
    { _id: "package_id", seq: 3 },
  ];

  await db.collection("counters").insertMany(counters);

  const summary = {
    db: db.databaseName,
    buildings: await db.collection("buildings").countDocuments(),
    rooms: await db.collection("rooms").countDocuments(),
    users: await db.collection("users").countDocuments(),
    staffs: await db.collection("staffs").countDocuments(),
    tenants: await db.collection("tenants").countDocuments(),
    packages: await db.collection("packages").countDocuments(),
    packageStatusLogs: await db.collection("packagestatuslogs").countDocuments(),
  };

  console.log("Seed completed", JSON.stringify(summary, null, 2));

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
