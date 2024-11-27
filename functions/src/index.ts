import * as functions from "firebase-functions";
import fetch, { RequestInit } from "node-fetch";

export const getVoices = functions.https.onRequest(async (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");

  if (request.method === "OPTIONS") {
    response.set("Access-Control-Allow-Methods", "GET");
    response.set("Access-Control-Allow-Headers", "Content-Type");
    response.set("Access-Control-Max-Age", "3600");
    response.status(204).send("");
    return;
  }

  const secretKey = process.env.PLAYHT_SECRET_KEY;
  const userId = process.env.PLAYHT_USER_ID;

  if (!secretKey || !userId) {
    response.status(500).json({error: "Missing API credentials"});
    return;
  }

  try {
    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${secretKey}`,
        "X-User-ID": userId,
      },
    };

    const playhtResponse = await fetch("https://api.play.ht/api/v2/voices", fetchOptions);

    if (!playhtResponse.ok) {
      const text = await playhtResponse.text();
      console.error("Voice API Error Response:", text);
      response.status(playhtResponse.status).send(text);
      return;
    }

    const data = await playhtResponse.json();
    response.json(data);
  } catch (err) {
    console.error("Voice library fetch error:", err);
    response.status(500).json({error: "Failed to fetch voices"});
  }
});
