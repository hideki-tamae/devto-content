import crypto from "node:crypto";

const API_KEY = process.env.X_API_KEY;
const API_SECRET = process.env.X_API_KEY_SECRET;
const ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const ACCESS_SECRET = process.env.X_ACCESS_TOKEN_SECRET;

function percentEncode(str) {
  return encodeURIComponent(str).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

function buildOAuthHeader(method, url) {
  const oauthParams = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  const signingKey = `${percentEncode(API_SECRET)}&${percentEncode(
    ACCESS_SECRET
  )}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  const headerParams = { ...oauthParams, oauth_signature: signature };
  return (
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k])}"`)
      .join(", ")
  );
}

export async function postToX(text) {
  if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_SECRET) {
    console.log("X credentials not set — skipping X post.");
    return null;
  }

  const url = "https://api.x.com/2/tweets";
  const authHeader = buildOAuthHeader("POST", url);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`X API post failed: ${res.status} ${body}`);
  }
  console.log(`Posted to X: ${text}`);
  return JSON.parse(body);
}
