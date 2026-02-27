import Counter from "@/models/Counter";

export async function nextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  return counter.seq;
}
