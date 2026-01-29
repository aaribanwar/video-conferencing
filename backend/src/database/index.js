import mongoose from "mongoose";

export default async function connectDB() {
  const mongo_uri = process.env.MONGO_URI;

  if (!mongo_uri) {
    throw new Error("MONGO_URI not set");
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongo_uri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  }
}
