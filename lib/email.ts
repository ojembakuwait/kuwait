import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Email adapter. No real email is sent and no provider credentials are needed.
 * - Locally (dev): messages are written to ./storage/mail so you can read the
 *   password-reset link from a file.
 * - On serverless hosts (read-only FS): the message is written to the OS temp
 *   dir if possible and always logged to the server console, so nothing crashes.
 * Replace `send` with an SMTP/API implementation to deliver real mail; keep
 * provider secrets in server-side env, out of source control.
 */
export type OutboundEmail = {
  to: string;
  subject: string;
  body: string;
};

function targetDir(): string {
  if (process.env.STORAGE_DIR) return path.join(path.resolve(process.env.STORAGE_DIR), 'mail');
  if (process.env.NODE_ENV === 'production') return path.join(os.tmpdir(), 'cc-mail');
  return path.join(process.cwd(), 'storage', 'mail');
}

export const email = {
  async send(msg: OutboundEmail): Promise<void> {
    const content = `To: ${msg.to}\nSubject: ${msg.subject}\nDate: ${new Date().toISOString()}\n\n${msg.body}\n`;
    try {
      const dir = targetDir();
      fs.mkdirSync(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeTo = msg.to.replace(/[^a-z0-9@._-]/gi, '_');
      fs.writeFileSync(path.join(dir, `${safeTo}-${stamp}.txt`), content);
    } catch {
      // Read-only filesystem — fall through to console logging.
    }
    // eslint-disable-next-line no-console
    console.log(`[dev-mail] to=${msg.to} subject="${msg.subject}"\n${msg.body}`);
  },
};
