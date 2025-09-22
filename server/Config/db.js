import mongoose from "mongoose";

export const ConnectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDb is connected to connection: ${conn.connection.host}.`);
  } catch (error) {
    console.log(`Some error occured: ${error.message}.`);
    process.exit(1);
  }
};
