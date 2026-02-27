import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const username = process.argv[2] || "admin";
const password = process.argv[3] || "admin123";

async function nextSequence(db, name) {
  const result = await db.collection("counters").findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return result.seq;
}

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const users = db.collection("users");
  const existing = await users.findOne({ username });

  if (existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await users.updateOne(
      { username },
      { $set: { password_hash: passwordHash, role: "ADMIN", status: "ACTIVE" } }
    );
    console.log(`Updated existing admin user '${username}'.`);
  } else {
    const userId = await nextSequence(db, "user_id");
    const passwordHash = await bcrypt.hash(password, 10);

    await users.insertOne({
      user_id: userId,
      username,
      password_hash: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Created admin user '${username}' (user_id=${userId}).`);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
