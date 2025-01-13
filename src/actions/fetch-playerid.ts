export async function FetchPlayerId(playerName: string): Promise<string> {
  try {
    const lookupUrl = `https://api.pubg.com/shards/steam/players?filter[playerNames]=${playerName}`;

    const lookipRes = await fetch(lookupUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.PUBG_KEY}`,
      },
    });

    const playerData = await lookipRes.json();

    return playerData.data[0].id;
  } catch (error) {
    return error instanceof Error ? error.message : "An unknown error occurred";
  }
}

export async function FetchPlayerStats(playerID: string) {
  try {
    const apiUrl = `https://api.pubg.com/shards/steam/seasons/lifetime/gameMode/solo/players?filter[playerIds]=${playerID}`;

    const data = await fetch(apiUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.PUBG_KEY}`,
      },
    });

    const playerStats = await data.json();

    return playerStats.data[0].attributes.gameModeStats.solo.kills || 0;
  } catch (error) {
    return (error as Error).message;
  }
}