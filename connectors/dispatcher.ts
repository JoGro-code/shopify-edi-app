import { as2Send } from "./as2";
import { httpsPost } from "./https";
import { sftpPut } from "./sftp";

export async function outboundDispatch(
  cfg: any,
  filename: string,
  payload: string
) {
  if (!cfg || !cfg.type) throw new Error("Missing outbound config");
  if (cfg.type === "sftp") {
    await sftpPut(cfg, filename, payload);
    return { method: "sftp", filename };
  }
  if (cfg.type === "https") {
    const res = await httpsPost(cfg.endpoint, payload, cfg.headers || {});
    return { method: "https", response: res };
  }
  if (cfg.type === "as2") {
    const res = await as2Send(cfg.endpoint, cfg.headers || {}, payload);
    return { method: "as2", response: res };
  }
  throw new Error("Unsupported outbound type");
}
