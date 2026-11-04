import { cookies } from "next/headers";
import { passphraseMatches, signGhostToken } from "@/lib/ghost-session";

export async function POST(request) {
  try {
    const { passphrase } = await request.json();
    
    if (!passphraseMatches(passphrase)) {
      return new Response(JSON.stringify({ error: "Invalid passphrase" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create ghost session token
    const token = signGhostToken();
    
    // Set httpOnly cookie - not readable from JS
    const cookieStore = await cookies();
    cookieStore.set("ghost_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours in seconds
      path: "/",
    });

    // Also set a flag cookie for UI to know ghost mode is active
    cookieStore.set("ghost_mode_active", "true", {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60,
      path: "/",
    });

    // Remove the old JS-readable token cookie if it exists from a prior version.
    cookieStore.delete("ghost_token_api");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Ghost auth error:", error);
    return new Response(JSON.stringify({ error: "Authentication failed", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
