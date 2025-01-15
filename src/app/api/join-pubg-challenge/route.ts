import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import GameRecord from "@/app/model/gameSchema";
import { connectToMongoDB } from "@/app/lib/connectDB";
import bs58 from "bs58";
import { createErrorResponse } from "@/actions/error-reponse";
import { FetchPlayerId, FetchPlayerStats } from "@/actions/fetch-playerid";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const gameID = url.searchParams.get("gameID");

  if (!gameID) {
    return createErrorResponse("Game ID not found", 404);
  }

  await connectToMongoDB();

  // Find the game record in the database
  const gameRecord = await GameRecord.findOne({ gameID });

  if (!gameRecord) {
    return createErrorResponse(`No game found with game ID ${gameID}`, 404);
  }

  const fetchPlayerWins = async (tag: string): Promise<number> => {
    try {
      const playerId = await FetchPlayerId(tag);

      if (playerId === null) {
        return 0;
      }

      const kills = await FetchPlayerStats(playerId);

      return kills;
    } catch (error) {
      console.error(`Failed to fetch wins for player ${tag}:`, error);
      return 0;
    }
  };

  const { players } = gameRecord;
  const leaderboard: { playerID: string; pubkey: string; wins: number }[] = [];

  for (const player of players) {
    const apiWins = await fetchPlayerWins(player.playerID);

    leaderboard.push({
      playerID: player.playerID,
      pubkey: player.pubkey,
      wins: apiWins - player.wins,
    });
  }

  leaderboard.sort((a, b) => b.wins - a.wins);

  const gameEndTime = new Date(
    gameRecord.startTime.getTime() + gameRecord.timeFrame * 60 * 1000
  );

  const hasGameEnded = new Date() >= gameEndTime;

  if (hasGameEnded && gameRecord.status !== "completed") {
    const winnerPubkey = new PublicKey(leaderboard[0].pubkey);

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const fromWalconst = Keypair.fromSecretKey(
      bs58.decode(process.env.SECRET_KEY!)
    );

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWalconst.publicKey,
        toPubkey: winnerPubkey,
        lamports: gameRecord.prizePool * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [
      fromWalconst,
    ]);

    gameRecord.winner = {
      playerID: leaderboard[0].playerID,
      pubkey: leaderboard[0].pubkey,
      wins: leaderboard[0].wins,
    };

    gameRecord.status = "completed";
    gameRecord.signature = signature;

    await gameRecord.save();
  }

  const timeRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(gameEndTime).getTime() - new Date().getTime()) / (60 * 1000)
    )
  );

  const response: ActionGetResponse = {
    icon: "https://i.ibb.co/tcbC6rW/Gemini-Generated-Image-dzxegldzxegldzxe.jpg",
    description: `**The Royal Duel has Begun!** The stage is set, and the battle is underway. **The Royal Duel** challenges you to prove your skill and strategy in a wagered head-to-head showdown. The stakes are high, the time is ticking, and the victor takes it all.

**Game Details:**

- **Game ID:** ${gameRecord.gameID} (${
      hasGameEnded ? "Game has ended" : "Game is ongoing"
    })
- **Duration:** ${gameRecord.timeFrame} minutes
- **Wager Amount:** ${gameRecord.totalWager} SOL
- **Prize pool:** ${gameRecord.prizePool} SOL
${
  !hasGameEnded
    ? `- **Remaining time:** ${timeRemaining} mins`
    : `Game has ended. \n ${gameRecord.winner.playerID} won with  ${gameRecord.winner.wins} wins and had been paid  ${gameRecord.prizePool} SOL [view on solscan](http://solscan.io/tx/${gameRecord.signature})`
}

**Leaderboard:**
${leaderboard
  .map(
    (player, index) =>
      `  ${index + 1}. ${player.playerID}: ${player.wins} ${
        index === 0 && hasGameEnded ? " -  Won the game" : ""
      }`
  )
  .join("\n")}

---

**Here's the current action:**

1.  **Game Started:** The game has officially begun, and the clock is ticking. 
2.  **Real-Time Updates:** Wins are being tracked live. Keep your eyes on the leaderboard!
3.  **Clash for the Crown:** Battle within the specified timeframe. Wins determine the ultimate victor.

---

**Stay in the arena! Fight for glory and the spoils of victory. const the clash continue!**`,
    title: "PUBG Solo TPP: Kill Challenge",
    label: "Join challenge",
    error: {
      message: "Some error occurred, please refresh",
    },
    links: {
      actions: [
        {
          label: "Join challenge",
          href: `${url.href}&tag={tag}`,
          type: "message",
          parameters: [
            {
              name: "tag",
              label: "Enter your in-game username",
              required: true,
            },
          ],
        },
      ],
    },
    disabled: hasGameEnded,
  };
  return NextResponse.json(response, {
    headers: {
      ...ACTIONS_CORS_HEADERS,
      "X-Action-Version": "2.1.3",
      "X-Blockchain-Ids": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    },
  });
}

export const OPTIONS = GET;

export async function POST(request: NextRequest) {
  try {
    const body: ActionPostRequest = await request.json();
    const url = new URL(request.url);

    const amount = Number(url.searchParams.get("amount"));
    const tag = url.searchParams.get("tag");
    const gameID = url.searchParams.get("gameID");

    const gameAccount = new PublicKey(
      "4tHXydupmCFzqqzRLBnzu5iSttatVwjPjx48A45keay8"
    );

    // Validate input
    if (!tag) {
      return createErrorResponse("Player tag must be provided");
    }

    if (!gameID) {
      return createErrorResponse("Game ID not foun", 404);
    }

    // Find the game record in the database
    const gameRec = await GameRecord.findOne({ gameID });

    if (!gameRec) {
      return createErrorResponse(`No game found with game ID ${gameID}`, 400);
    }

    let sender: PublicKey;
    try {
      sender = new PublicKey(body.account);
    } catch {
      return createErrorResponse("Invalid account", 400);
    }

    // Connect to MongoDB and create a new game record
    const mongoDB = await connectToMongoDB();

    if (!mongoDB) {
      return createErrorResponse("Failed to connect to database");
    }

    const existingPlayer = gameRec.players.find(
      (player) => player.playerID === tag
    );

    if (existingPlayer) {
      return createErrorResponse(`Player ${tag} is already the game`);
    }

    const playerId = await FetchPlayerId(tag);

    if (playerId === null) {
      return createErrorResponse("Failed to find player");
    }

    const kills = await FetchPlayerStats(playerId);

    if (kills === null && typeof kills !== "number") {
      return createErrorResponse(
        "Failed to get player stats or kills is not a number"
      );
    }

    // Add the new player to the game
    gameRec.players.push({
      playerID: tag,
      pubkey: body.account,
      wins: kills,
    });

    gameRec.prizePool += gameRec.prizePool;

    await gameRec.save();

    // Connect to Solana and prepare transaction
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: gameAccount,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    // finalize transaction
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    transaction.feePayer = sender;
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    // Calculate fee
    const feeData = await connection.getFeeForMessage(
      transaction.compileMessage(),
      "confirmed"
    );
    const fee = feeData.value;

    // Check sender's balance
    const balance = await connection.getBalance(sender);
    const requiredBalance = amount * LAMPORTS_PER_SOL + fee!;

    if (balance < requiredBalance) {
      return createErrorResponse(
        `Insufficient funds. Available: ${
          balance * LAMPORTS_PER_SOL
        } SOL, Needed: ${requiredBalance.toFixed(6)} SOL`,
        400
      );
    }

    const baseuri = `${url.origin}/api/join-pubg-challenge/?gameID=${gameID}`;
    const encodedURI = encodeURIComponent(baseuri);

    const uri = `https://dial.to/?action=solana-action%3A${encodedURI}`;

    // Create payload and return response
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Congratulations, you have joined the game, share link with others to join: ${uri}`,
      },
    });

    return NextResponse.json(payload, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return createErrorResponse(
      "An error occurred while processing the request.",
      500
    );
  }
}
