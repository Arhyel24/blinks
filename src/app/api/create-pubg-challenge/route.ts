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
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import GameRecord from "@/app/model/gameSchema";
import { connectToMongoDB } from "@/app/lib/connectDB";
import { FetchPlayerId, FetchPlayerStats } from "@/actions/fetch-playerid";
import { createErrorResponse } from "@/actions/error-reponse";

// #YU80RGRG8;
// #89YQU2PVQ
// #QRPQLGYGR;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const response: ActionGetResponse = {
    icon: "https://i.ibb.co/tcbC6rW/Gemini-Generated-Image-dzxegldzxegldzxe.jpg",
    description: `\n**Get ready for an adrenaline-pumping PUBG Solo TPP Kill Challenge!**\n\nIt's not just about surviving; it's about dominating the battlefield and outgunning your opponent in a battle of pure skill and strategy. This is your chance to prove you have what it takes to be the ultimate PUBG champion. Whether you're sneaking through the grass or charging into a firefight, every kill counts towards your victory. Set your stakes, pick your fight, and get ready to take on your rivals in an intense, wagered Solo TPP match.\n\n**How to Play:**\n\n1.  **Issue Your Challenge!:** As the challenger, you’ll set the wager amount (in SOL) and choose the match duration. You’re the one setting the terms of this showdown.\n2.  **Send Out the Call!:** Once you’ve created your challenge, you’ll get a unique link to share with your opponent(s). Share the link to summon them to battle!\n3.  **Accept the Duel!:** Your opponent(s) will accept your challenge by clicking on the link, entering their PUBG player tag to confirm, and preparing for combat.\n4.  **Fight for the Top Spot!:** Once the match begins, it’s a free-for-all. The countdown ticks away as you battle for kills. The player with the most kills at the end of the match wins the challenge and claims the wagered amount!\n\nWith each kill, you get closer to victory and bragging rights as the ultimate solo kill king. The battleground is calling, and it’s time to answer!\n\n---\n\n**Are you ready to claim your victory? Issue your challenge now, and may the best marksman win!**\n
  
`,
    title: "PUBG Solo TPP: Kill Challenge",
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
              required: true,
            },
            {
              name: "tag",
              label: "Enter your in-game username",
              required: true,
            },
            {
              name: "duration",
              label: "Select the duration",
              type: "select",
              required: true,
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
    const duration = Number(url.searchParams.get("duration"));

    const gameAccount = new PublicKey(
      "4tHXydupmCFzqqzRLBnzu5iSttatVwjPjx48A45keay8"
    );

    // Validate input
    if (!amount || !tag || !duration) {
      return createErrorResponse("Amount, duration and tag must be provided");
    }

    let sender: PublicKey;
    try {
      sender = new PublicKey(body.account);
    } catch {
      return createErrorResponse("Invalid account");
    }

    // Connect to MongoDB and create a new game record
    const mongoDB = await connectToMongoDB();

    if (!mongoDB) {
      return createErrorResponse("Failed to connect to database");
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

    const player = {
      playerID: tag,
      pubkey: body.account,
      wins: kills,
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
      return createErrorResponse(
        `Insufficient funds. Available: ${
          balance * LAMPORTS_PER_SOL
        } SOL, Needed: ${requiredBalance.toFixed(6)} SOL`
      );
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
    return createErrorResponse((error as Error).message);
  }
}
