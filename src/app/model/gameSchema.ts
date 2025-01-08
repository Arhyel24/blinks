import mongoose, { Document, Model, Schema } from "mongoose";
import { nanoid } from "nanoid";

// Interface for a Player
interface IPlayer {
  playerID: string;
  pubkey: string;
  wins: number;
}

// Player Schema
const PlayerSchema: Schema = new Schema<IPlayer>({
  playerID: {
    type: String,
    required: true,
  },
  pubkey: {
    type: String,
    required: true,
  },
  wins: { type: Number, required: true },
});

interface IGameRecord extends Document {
  gameID: string;
  totalWager: number;
  prizePool: number;
  players: IPlayer[]; // Array of public keys
  timeFrame: number; // How long the game lasts
  startTime: Date;
  status: string;
  signature: string;
}

const GameRecordSchema: Schema = new Schema<IGameRecord>({
  gameID: {
    type: String,
    default: () => nanoid(8), // Auto-generate a short 8-character ID
    unique: true,
    required: true,
  },
  totalWager: {
    type: Number,
    required: true,
  },
  prizePool: {
    type: Number,
    required: true,
  },
  players: {
    type: [PlayerSchema], // Array of players
    required: true,
    validate: {
      validator: (array: IPlayer[]) => array.length > 0,
      message: "Players array must contain at least one player.",
    },
  },
  timeFrame: {
    type: Number,
    required: true,
    validate: {
      validator: (timeFrame: number) => timeFrame > 0,
      message: "Time frame must be a positive number.",
    },
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["ongoing", "completed"],
    default: "ongoing",
  },
  signature: {
    type: String,
  },
});

const GameRecord: Model<IGameRecord> =
  mongoose.models.GameRecord ||
  mongoose.model<IGameRecord>("GameRecord", GameRecordSchema);

export default GameRecord;
