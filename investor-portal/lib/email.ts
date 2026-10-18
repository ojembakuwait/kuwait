import { storage } from './storage';

/**
 * Email adapter. The default development adapter writes each message to a local
 * "inbox" under storage/mail instead of sending real email, so the local setup
 * runs with no provider credentials. Replace with an SMTP/API implementation
 * (same `send` signature) to deliver real mail; keep provider secrets in env.
 */
export type OutboundEmail = {
  to: string;
  subject: string;
  body: string;
};

export const email = {
  async send(msg: OutboundEmail): Promise<void> {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTo = msg.to.replace(/[^a-z0-9@._-]/gi, '_');
    const key = `mail/${safeTo}/${stamp}.txt`;
    storage.write(
      key,
      `To: ${msg.to}\nSubject: ${msg.subject}\nDate: ${new Date().toISOString()}\n\n${msg.body}\n`,
    );
    // eslint-disable-next-line no-console
    console.log(`[dev-mail] stored message for ${msg.to} at storage/${key}`);
  },
};
