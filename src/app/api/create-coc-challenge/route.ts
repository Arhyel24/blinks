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
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import GameRecord from "@/app/model/gameSchema";
import { connectToMongoDB } from "@/app/lib/connectDB";

// #YU80RGRG8;
// #89YQU2PVQ
// #QRPQLGYGR;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const response: ActionGetResponse = {
    icon: "https://i.ibb.co/zQXg3Hm/4f69bf9d37b9ef9528a999486176660f.jpg",
    description: `
**Settle the score in a head-to-head showdown! The Royal Duel** consts you challenge your friends to a wagered battle of skill and strategy. Set the stakes, define the time limit, and prove your dominance in the arena. The victor claims both the bragging rights and the wagered amount.

**Here's the intel:**

1.  **Issue the Challenge!:** As the challenger, you'll provide your username, the wager amount, and the duration of the duel. This creates the official challenge.
2.  **Share the Royal Summons!:** You'll receive a unique link to share with your chosen opponent(s).
3.  **Accept the Duel!:** Your opponent(s) use the link to accept the challenge and enter their username to confirm their participation.
4.  **Clash for the Crown!:** Battle within the specified timeframe. Wins are tracked to determine the ultimate victor.

---

**Ready to duel? Issue your Royal Summons and const the clash begin!**
`,
    title: "Clash Royale: The Royal Duel",
    label: "Create challenge",
    error: {
      message: "Some error occurred, please refresh",
    },
    links: {
      actions: [
        {
          label: "Create challenge",
          href: `${url.href}?tag={tag}&amount={amount}&duration={duration}`,
          type: "message",
          parameters: [
            {
              name: "amount",
              label: "Set wager amount in SOL",
            },
            {
              name: "tag",
              label: "Enter your player tag (e.g #QRPQLGYGR)",
            },
            {
              name: "duration",
              label: "Select the duration",
              type: "select",
              options: [
                {
                  value: "10",
                  label: "10 minutes",
                },
                {
                  value: "20",
                  label: "20 minutes",
                },
                {
                  value: "30",
                  label: "30 minutes",
                },
              ],
            },
          ],
        },
      ],
    },
  };
  return NextResponse.json(response, {
    headers: {
      ...ACTIONS_CORS_HEADERS,
      "X-Action-Version": "2.1.3",
      "X-Blockchain-Id": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    },
  });
}

export const OPTIONS = GET;

export async function POST(request: NextRequest) {
  try {
    const body: ActionPostRequest = await request.json();
    const url = new URL(request.url);

    const amount = Number(url.searchParams.get("amount"));
    const tag = url.searchParams.get("tag")?.slice(1);
    const duration = Number(url.searchParams.get("duration"));

    const gameAccount = new PublicKey(
      "4tHXydupmCFzqqzRLBnzu5iSttatVwjPjx48A45keay8"
    );

    // Validate input
    if (!amount || !tag || !duration) {
      const errorRes: ActionError = {
        message: "Amount, duration and tag must be provided",
      };
      return new Response(JSON.stringify(errorRes), {
        status: 400,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          "X-Action-Version": "2.1.3",
          "X-Blockchain-Id": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        },
      });
    }

    let sender: PublicKey;
    try {
      sender = new PublicKey(body.account);
    } catch {
      const errorRes: ActionError = {
        message: "Invalid account",
      };
      return new Response(JSON.stringify(errorRes), {
        status: 400,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          "X-Action-Version": "2.1.3",
          "X-Blockchain-Id": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        },
      });
    }

    // Connect to MongoDB and create a new game record
    const mongoDB = await connectToMongoDB();

    if (!mongoDB) {
      const errorRes: ActionError = {
        message: "Some error occurred, please try again",
      };
      return new Response(JSON.stringify(errorRes), {
        status: 400,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          "X-Action-Version": "2.1.3",
          "X-Blockchain-Id": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        },
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

    const player = {
      playerID: tag,
      pubkey: body.account,
      wins: playerData.attackWins,
    };

    const gameRecord = new GameRecord({
      totalWager: amount,
      prizePool: amount,
      players: [player],
      timeFrame: duration,
      startTime: Date.now(),
    });

    const savedRecord = await gameRecord.save();

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
      const errorRes: ActionError = {
        message: `Insufficient funds. Available: ${
          balance * LAMPORTS_PER_SOL
        } SOL, Needed: ${requiredBalance.toFixed(6)} SOL`,
      };
      return NextResponse.json(errorRes, {
        status: 400,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          "X-Action-Version": "2.1.3",
          "X-Blockchain-Id": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        },
      });
    }

    const baseuri = `${url.origin}/api/join-coc-challenge/?gameID=${savedRecord.gameID}`;
    const encodedURI = encodeURIComponent(baseuri);

    const uri = `https://dial.to/?action=solana-action%3A${encodedURI}`;

    // Create payload and return response
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `The challenge is on! Share this link with your friends and const the games begin: ${uri}`,
      },
    });

    return NextResponse.json(payload, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error("Error processing POST request:", error);
    const errorRes: ActionError = {
      message: "An error occurred while processing the request.",
    };
    return new Response(JSON.stringify(errorRes), {
      status: 400,
      headers: {
        ...ACTIONS_CORS_HEADERS,
        "X-Action-Version": "2.1.3",
        "X-Blockchain-Id": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      },
    });
  }
}
