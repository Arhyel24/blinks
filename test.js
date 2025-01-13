const fs = require("fs");
const fetch = require("node-fetch");

// const url =
//   "https://api.pubg.com/shards/steam/seasons/lifetime/gameMode/solo/players?filter[playerIds]=account.c0e530e9b7244b358def282782f893af";

// const options = {
//   method: "GET",
//   headers: {
//     accept: "application/json",
//     Authorization:
//       "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJmMjczZWNjMC1hZmM2LTAxM2QtMGE5My01MjVhODQwZDc4YWQiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzM2MzI0MjU4LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6ImJsaW5rcyJ9.wpHqVl9IK6ZEDN1AYtssCQ4YJ8g0MQACa6VZ5ipuvhc",
//   },
// };

// fetch(url, options)
//   .then((response) => {
//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }
//     return response.json();
//   })
//   .then((data) => {
//     const kills = data.data[0].attributes.gameModeStats.solo.kills;
//     console.log("Kills in solo mode:", kills);
//   })
//   .catch((error) => {
//     console.error("Error fetching PUBG data:", error.message);
//   });

const playerName = "Yy16698-LYY"; // Replace with the player's username
const lookupUrl = `https://api.pubg.com/shards/steam/players?filter[playerNames]=${playerName}`;

const options = {
  method: "GET",
  headers: {
    accept: "application/vnd.api+json",
    Authorization:
      "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJmMjczZWNjMC1hZmM2LTAxM2QtMGE5My01MjVhODQwZDc4YWQiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzM2MzI0MjU4LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6ImJsaW5rcyJ9.wpHqVl9IK6ZEDN1AYtssCQ4YJ8g0MQACa6VZ5ipuvhc", // Replace with your PUBG API key
  },
};

fetch(lookupUrl, options)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    console.log(data);
    const playerId = data.data[0].id; // Extract the Player ID
    console.log("Player ID:", playerId);

    const output = `const pubgData = ${JSON.stringify(
      data,
      null,
      2
    )};\n\nexport default playerdata;`;

    fs.writeFile("playerdata.js", output, (err) => {
      if (err) {
        console.error("Error saving data to file:", err.message);
      } else {
        console.log("Data saved to pubgData.js");
      }
    });
  })
  .catch((error) => {
    console.error("Error fetching player ID:", error.message);
  });
