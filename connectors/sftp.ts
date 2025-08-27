import SFTPClient from "ssh2-sftp-client";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";

export type SftpConfig = {
  host: string; port?: number; username: string; password?: string; privateKey?: string;
  directory?: string; archiveDir?: string; pattern?: string;
};

export async function sftpPoll(config: SftpConfig) {
  const sftp = new SFTPClient();
  await sftp.connect({
    host: config.host, port: config.port || 22, username: config.username,
    password: config.password, privateKey: config.privateKey
  });
  const dir = config.directory || "/";
  const list = await sftp.list(dir);
  const files = list.filter(f => !f.type && (!config.pattern || new RegExp(config.pattern.replace(".", "\.").replace("*",".*")).test(f.name)));
  const results: { name: string; content: string; hash: string; }[] = [];
  for (const f of files) {
    const data = await sftp.get(`${dir}/${f.name}`);
    const content = data.toString();
    const hash = createHash("sha256").update(content).digest("hex");
    results.push({ name: f.name, content, hash });
    if (config.archiveDir) {
      const target = `${config.archiveDir}/${f.name}`;
      await sftp.mkdir(config.archiveDir, true).catch(()=>{});
      await sftp.rename(`${dir}/${f.name}`, target);
    } else {
      await sftp.delete(`${dir}/${f.name}`);
    }
  }
  await sftp.end();
  return results;
}

export async function sftpPut(config: SftpConfig, filename: string, content: string) {
  const sftp = new SFTPClient();
  await sftp.connect({
    host: config.host, port: config.port || 22, username: config.username,
    password: config.password, privateKey: config.privateKey
  });
  const dir = config.directory || "/";
  await sftp.mkdir(dir, true).catch(()=>{});
  await sftp.put(Buffer.from(content), `${dir}/${filename}`);
  await sftp.end();
}
