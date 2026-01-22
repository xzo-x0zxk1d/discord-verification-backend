import fetch from "node-fetch";

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  try {
    // 1) Exchange code for access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error(tokenData);
      return res.status(400).json({ error: "Token exchange failed", details: tokenData });
    }

    const accessToken = tokenData.access_token;

    // 2) Get user info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = await userRes.json();
    if (!userRes.ok) {
      console.error(user);
      return res.status(400).json({ error: "Failed to get user", details: user });
    }

    const userId = user.id;

    // 3) Add user to guild
    const guildRes = await fetch(
      `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
        },
        body: JSON.stringify({ access_token: accessToken })
      }
    );

    if (guildRes.status !== 201 && guildRes.status !== 204) {
      const guildBody = await guildRes.text();
      console.error(guildBody);
      return res.status(400).json({ error: "Failed to add user to guild", details: guildBody });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
