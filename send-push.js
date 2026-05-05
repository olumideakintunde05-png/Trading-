// netlify/functions/send-push.js
// Sends FCM V1 push notification to all tokens stored in Firestore

const SA = {
  project_id: "daniel-wisdom-hub",
  private_key_id: "426f15245b3d9305f019d5f92838cce1c811821d",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC5brLFtuGUZDOX\nCx8brcNkpvU25pCOUD2jckKx8Hefp2EiTyXnnSWspl+np9EOSJax7YSwKKkN14fe\ndwBYY+XbXU/xDRXIwAz9TLXZ6I5b2bqcP/nvStDTGlY26gyaQb/kz2aTETL+5HhE\nHFaYsUxAxlPe/ExJ+NEujt2pFsM8WROoFXqwPBcsXcY+75vDrRFROCZkK4WLwyIX\nJJfRAAJ9LJT+4T8uBuGMlyXq0EP4lTsHjWSzqe6YvRCd3NbSVPzU+fSA/0bb5aN1\nwuH/u4mAliDhA6J6c5w8xXUUrH20IeFIoW0pm01GurQ2so320Yx5MmjvLWaDjo1F\n0h5aA/69AgMBAAECggEAChcJWxj5hdpSSf6qLZajL5vRHdtmaW6u0pu8oCjnosmY\nD2ad91Aq/7hu3d/Tuuf9a9xIMHtfQDhRNZb6mb9X1NEAm6snW2It4sOU5UZSUWep\nJT2Vne0k10kogKT0KhmioDKekClAVzPQjSjl7Q7qtAnxVYxwzJlMLUZ2A8XQD6gT\nvKB5g5qXYjudsqylBbF+9HIW4IMi9Oc6P2d2qmhvRhrdEJpHZjBnr1/GyU74tpgP\nmo2CTpwkpA5sS+owBT8PcPvHtXlqxK5tNS0YAxvOSxhauS2eCQS6R1Vx9F6/2Nne\nl5+e1spot67d9oODOapC/tutYoR42HcOpEYZWs462QKBgQDrNMUUfNPpLiKqC/ZJ\nJIxhXyV2kbFIUc83knfj/M0Up5IvTrKRy7oQnmSnDr4kRnzspLrRALg+Fx6v8G4q\npfEq+7p3od7VTQcegDSdw5MY8D5Qkt8A5i7EgWulVmqoU/7AiPyW6TXu56pW87nl\nHG+QRyMVXYDWewOlX0di3U13NQKBgQDJ03Cxhi0hIDdexekBw8GEM4o7Srn6B81R\nywFSp+elmG4rgcVgfvaaO3kkDGUoCUj4SWnnKUuV0q4Xela31/ZLZMHJP0PXYCIx\nZzixwZHusgxwHRybBlmm1Y4cpAvMQFZ404mk5eh1ORmpidC4/hLyldsemZAh9rv9\nJNF1LBbyaQKBgQCKITt8hLKOxqFk7BF/cw9eP9pof7d1mVXwdPwj0FtAPgkD71u/\nc72Z9Ot3kJjqBNtovnVYOOv6yukiujh4o2u2qo8fotiSu+Hqb7B21lyU0MJH33lH\ntebRUJA/UTjiEjISMGDm357k5viKiCgr/T8npB9edMMtMqE5hXMPBJhx4QKBgDpp\nz/wRcY5c3Km5bi7skV3J7QAsKJeNGofJ0aAyqIDtFTXSYWYEWStaez1LuRtVVKFH\n3jbhZNcAGxMAfYjIIKjBiLTOcrwrPro9vdL0y1/ieGcaheT4eYon1PHFKQT8ugpO\nb1Aimp0S4bKICLkCEEnVxY2dtHGgD9i8h0L6d8nBAoGADs07Nk5jtlLFlgrQEHOC\nFRGkLDpRwigfKkjbMb6Q+4o9lwh8rAPOl/7mD/YcNv5dNamWAD7mP2mq1FF7oItI\nFgAO/7sk0yIb5qMGptZHT7hetAFmE63WNK3mXFQ9Q/iVcltWEf2ZdaDkesHg+1ca\nsm5ji1/UPVifUfXxUCN+4no=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@daniel-wisdom-hub.iam.gserviceaccount.com",
  token_uri: "https://oauth2.googleapis.com/token"
};

const PROJECT_ID = "daniel-wisdom-hub";
const FB_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FCM_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

// ── Create JWT for Google OAuth2 ──
async function createJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: SA.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore",
    aud: SA.token_uri,
    exp: now + 3600,
    iat: now
  };

  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const sigInput = `${enc(header)}.${enc(payload)}`;

  // Import private key and sign
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(SA.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(sigInput));
  const sigB64 = Buffer.from(sig).toString("base64url");
  return `${sigInput}.${sigB64}`;
}

function pemToDer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  return Buffer.from(b64, "base64");
}

// ── Get OAuth2 access token ──
async function getAccessToken() {
  const jwt = await createJWT();
  const res = await fetch(SA.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("No access token: " + JSON.stringify(data));
  return data.access_token;
}

// ── Get all FCM tokens from Firestore ──
async function getTokens(accessToken) {
  const res = await fetch(`${FB_BASE}/push_tokens`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await res.json();
  if (!data.documents) return [];
  return data.documents
    .map(d => d.fields?.fcmToken?.stringValue)
    .filter(Boolean);
}

// ── Send one FCM message ──
async function sendOne(token, title, body, url, accessToken) {
  const res = await fetch(FCM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        webpush: {
          notification: {
            title, body,
            icon: "/icon.png",
            badge: "/icon.png",
            vibrate: [200, 100, 200],
            requireInteraction: true
          },
          fcm_options: { link: url || "/" }
        }
      }
    })
  });
  return res.ok;
}

// ── Main handler ──
export const handler = async (event) => {
  // CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { title, body, url } = JSON.parse(event.body || "{}");
    if (!body) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing body" }) };

    const accessToken = await getAccessToken();
    const tokens = await getTokens(accessToken);

    if (!tokens.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ sent: 0, message: "No tokens found" }) };
    }

    // Send to all tokens
    const results = await Promise.allSettled(
      tokens.map(t => sendOne(t, title || "Daniel Wisdom Hub ✨", body, url, accessToken))
    );
    const sent = results.filter(r => r.status === "fulfilled" && r.value).length;
    const failed = results.length - sent;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sent, failed, total: tokens.length })
    };
  } catch (err) {
    console.error("send-push error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
