import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    
    // Clear ghost session cookies - this is also NOT logged
    cookieStore.delete("ghost_session");
    cookieStore.delete("ghost_mode_active");
    cookieStore.delete("ghost_token_api");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Ghost logout error:", error);
    return new Response(JSON.stringify({ error: "Logout failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
