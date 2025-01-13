import { ACTIONS_CORS_HEADERS } from "@solana/actions";

export function createErrorResponse(
  message: string,
  status: number = 400
): Response {
  const errorRes = { message };
  return new Response(JSON.stringify(errorRes), {
    status,
    headers: {
      ...ACTIONS_CORS_HEADERS,
      "X-Action-Version": "2.1.3",
      "X-Blockchain-Ids": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    },
  });
}
