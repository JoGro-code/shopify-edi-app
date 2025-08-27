/**
 * Sends payload to a managed AS2 HTTP gateway (e.g., OpenAS2 REST bridge).
 * You must configure endpoint & headers (AS2-From, AS2-To, Message-Id, Content-Type, etc.).
 */
export async function as2Send(endpoint: string, headers: Record<string,string>, payload: string | Buffer) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: payload
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AS2 send failed: ${res.status} ${res.statusText} - ${text}`);
  }
  return await res.text();
}
