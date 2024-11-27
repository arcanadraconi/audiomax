import {onRequest} from "firebase-functions/v2/https";
import fetch, {RequestInit} from "node-fetch";
import * as functions from "firebase-functions";
import {Request, Response} from "express";

export const getVoices = onRequest({
  cors: true,
  maxInstances: 10,
  invoker: "public", // Allow unauthenticated access
  region: "us-central1",
}, async (request: Request, response: Response) => {
  try {
    const config = functions.config();
    const secretKey = config.playht?.secret_key;
    const userId = config.playht?.user_id;

    if (!secretKey || !userId) {
      console.error("Missing API credentials:", {config});
      response.status(500).json({error: "Missing API credentials"});
      return;
    }

    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${secretKey}`,
        "X-User-ID": userId,
      },
    };

    console.log("Fetching voices with config:", {
      secretKey: secretKey.substring(0, 4) + "...",
      userId: userId.substring(0, 4) + "...",
    });

    const playhtResponse = await fetch(
      "https://api.play.ht/api/v2/voices",
      fetchOptions,
    );

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
