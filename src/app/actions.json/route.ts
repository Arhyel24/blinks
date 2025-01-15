import { ACTIONS_CORS_HEADERS, ActionsJson } from "@solana/actions";

export const GET = async () => {
  const payload: ActionsJson = {
    rules: [
      // Map all root level routes to an action
      {
        pathPattern: "/",
        apiPath: "/api/create-coc-challenge/",
      },
      {
        pathPattern: "/",
        apiPath: `/api/join-coc-challenge/`,
      },
    ],
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      ...ACTIONS_CORS_HEADERS,
      "X-Action-Version": "2.1.3",
      "X-Blockchain-Ids": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    },
  });
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;
