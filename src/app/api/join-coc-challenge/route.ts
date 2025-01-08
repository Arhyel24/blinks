import {
  ActionError,
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

// #YU80RGRG8;
// #89YQU2PVQ
// #QRPQLGYGR;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const gameID = url.searchParams.get("gameID");

  var signature;
  if (!gameID) {
    let errorRes: ActionError = {
      message: "Game ID not found",
    };
    return new Response(JSON.stringify(errorRes), {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  await connectToMongoDB();

  // Find the game record in the database
  const gameRecord = await GameRecord.findOne({ gameID });

  if (!gameRecord) {
    let errorRes: ActionError = {
      message: `No game found with game ID ${gameID}`,
    };
    return new Response(JSON.stringify(errorRes), {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  const fetchPlayerWins = async (playerID: string): Promise<number> => {
    try {
      const qres = await fetch(
        `https://api.clashofclans.com/v1/players/%23${playerID}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/vnd.api+json",
            Authorization: `Bearer ${process.env.COC_API_KEY}`,
          },
        }
      );

      const playerData = await qres.json();

      return playerData.attackWins;
    } catch (error) {
      console.error(`Failed to fetch wins for player ${playerID}:`, error);
      return 0; // Default to 0 if the API call fails
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

    const fromWallet = Keypair.fromSecretKey(
      bs58.decode(process.env.SECRET_KEY!)
    );

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: winnerPubkey,
        lamports: gameRecord.prizePool * LAMPORTS_PER_SOL,
      })
    );

    signature = await sendAndConfirmTransaction(connection, transaction, [
      fromWallet,
    ]);

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
    icon: "https://i.ibb.co/zQXg3Hm/4f69bf9d37b9ef9528a999486176660f.jpg",
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
    : `Game has ended and user has been credited, [view on solscan](http://solscan.io/tx/${gameRecord.signature})`
}

**Leaderboard:**
${leaderboard
  .map(
    (player, index) =>
      `  ${index + 1}. #${player.playerID}: ${player.wins} ${
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

**Stay in the arena! Fight for glory and the spoils of victory. Let the clash continue!**`,
    title: "Clash Royale: The Royal Duel",
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
              label: "Enter your player tag",
            },
          ],
        },
      ],
    },
    disabled: hasGameEnded,
  };
  return NextResponse.json(response, {
    headers: ACTIONS_CORS_HEADERS,
  });
}

export const OPTIONS = GET;

export async function POST(request: NextRequest) {
  try {
    const body: ActionPostRequest = await request.json();
    const url = new URL(request.url);

    const amount = Number(url.searchParams.get("amount"));
    const tag = url.searchParams.get("tag")?.slice(1);
    const gameID = url.searchParams.get("gameID");
    const duration = Number(url.searchParams.get("duration"));

    const gameAccount = new PublicKey(
      "4tHXydupmCFzqqzRLBnzu5iSttatVwjPjx48A45keay8"
    );

    let errorRes: ActionError;

    // Validate input
    if (!tag) {
      let errorRes: ActionError = {
        message: "Player tag must be provided",
      };
      return new Response(JSON.stringify(errorRes), {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    if (!gameID) {
      let errorRes: ActionError = {
        message: "Game ID not found",
      };
      return new Response(JSON.stringify(errorRes), {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    // Find the game record in the database
    const gameRec = await GameRecord.findOne({ gameID });

    if (!gameRec) {
      let errorRes: ActionError = {
        message: `No game found with game ID ${gameID}`,
      };
      return new Response(JSON.stringify(errorRes), {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    let sender: PublicKey;
    try {
      sender = new PublicKey(body.account);
    } catch {
      let errorRes: ActionError = {
        message: "Invalid account",
      };
      return new Response(JSON.stringify(errorRes), {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    // Connect to MongoDB and create a new game record
    const mongoDB = await connectToMongoDB();

    if (!mongoDB) {
      let errorRes: ActionError = {
        message: "Some error occurred, please try again",
      };
      return new Response(JSON.stringify(errorRes), {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const existingPlayer = gameRec.players.find(
      (player) => player.playerID === tag
    );

    if (existingPlayer) {
      let errorRes: ActionError = {
        message: "Player already exists in the game",
      };
      return new Response(JSON.stringify(errorRes), {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const qres = await fetch(
      `https://api.clashofclans.com/v1/players/%23${tag}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${process.env.COC_API_KEY}`,
        },
      }
    );

    const playerData = await qres.json();

    if (!playerData) {
      let errorRes: ActionError = {
        message: `No player found with the provided ID: #${tag}`,
      };
      return new Response(JSON.stringify(errorRes), {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }
    // Add the new player to the game
    gameRec.players.push({
      playerID: tag,
      pubkey: body.account,
      wins: playerData.attackWins,
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
      let errorRes: ActionError = {
        message: `Insufficient funds. Available: ${
          balance * LAMPORTS_PER_SOL
        } SOL, Needed: ${requiredBalance.toFixed(6)} SOL`,
      };
      return NextResponse.json(errorRes, {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const encodedURI = encodeURIComponent(url.href);

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
    let errorRes: ActionError = {
      message: "An error occurred while processing the request.",
    };
    return new Response(JSON.stringify(errorRes), {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
}
