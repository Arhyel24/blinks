import mongoose from "mongoose";

export async function connectToMongoDB(): Promise<mongoose.Connection | null> {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    // console.log("Connected to MongoDB");
    return mongoose.connection;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    return null;
  }
}