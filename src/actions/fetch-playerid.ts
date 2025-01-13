export async function FetchPlayerId(
  playerName: string
): Promise<string | null> {
  try {
    const lookupUrl = `https://api.pubg.com/shards/steam/players?filter[playerNames]=${playerName}`;

    const lookupRes = await fetch(lookupUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_PUBG_KEY}`,
      },
    });

    if (!lookupRes.ok) return null;

    const playerData = await lookupRes.json();

    return playerData.data[0].id;
  } catch (error) {
    console.error(error);
    return null
  }
}

export async function FetchPlayerStats(playerID: string) {
  try {
    const apiUrl = `https://api.pubg.com/shards/steam/seasons/lifetime/gameMode/solo/players?filter[playerIds]=${playerID}`;

    const data = await fetch(apiUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_PUBG_KEY}`,
      },
    });

    if (!data.ok) return null

    const playerStats = await data.json();

    return playerStats.data[0].attributes.gameModeStats.solo.kills;
  } catch (error) {
    console.error("Error occured:", error);
    return null
  }
}
