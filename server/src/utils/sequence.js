import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: Number, default: 0 }
});

const Counter = mongoose.model("Counter", counterSchema);

export async function nextSequence(key, session) {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { new: true, upsert: true, session }
  );
  return counter.value;
}

