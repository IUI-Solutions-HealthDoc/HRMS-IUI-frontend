function readGhostError(payload, fallback = "Request failed") {
  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
  if (typeof payload?.detail === "string" && payload.detail.trim()) return payload.detail;
  if (typeof payload?.message === "string" && payload.message.trim()) return payload.message;
  return fallback;
}

export async function ghostFetch(path, opts = {}) {
  const isFormData = opts.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(opts.headers || {}),
  };

  const response = await fetch(`/api/ghost${path}`, {
    ...opts,
    headers,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(readGhostError(data, "Ghost request failed"));
  }

  return data;
}
