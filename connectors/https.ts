export async function httpsPost(endpoint: string, body: string | object, headers: Record<string,string> = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: payload
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTPS POST failed: ${res.status} ${res.statusText} - ${text}`);
  }
  return await res.text();
}
