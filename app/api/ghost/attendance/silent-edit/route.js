import { getGhostSessionToken, jsonResponse } from "@/lib/ghost-session";

export async function PATCH(request) {
  try {
    const ghostToken = await getGhostSessionToken();

    if (!ghostToken) {
      return jsonResponse({ error: "Unauthorized" }, 403);
    }

    const { record_id, field, new_value } = await request.json();

    const ALLOWED_FIELDS = ["check_in", "check_out"];
    if (!ALLOWED_FIELDS.includes(field)) {
      return jsonResponse({ error: "Field not allowed" }, 400);
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const apiUrl = `${backendUrl}/ghost/attendance/silent-edit?record_id=${record_id}&field=${field}&new_value=${encodeURIComponent(new_value)}&ghost_token=${encodeURIComponent(ghostToken)}`;

    const res = await fetch(apiUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const error = await res.json();
      return jsonResponse(error, res.status);
    }

    const data = await res.json();
    return jsonResponse(data);
  } catch (error) {
    console.error("Silent edit error:", error);
    return jsonResponse({ error: "Update failed", details: error.message }, 500);
  }
}
