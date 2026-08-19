# Privacy-Preserving Outreach Ledger

This directory records every restaurant prospect in the Jack’s Dining Room outreach campaign, including sourced, sent, and Zoho-scheduled contacts. It is designed for public duplicate prevention without exposing raw email addresses or outreach copy.

| Field | Purpose |
|---|---|
| `restaurant_name` | Restaurant identity for human review. |
| `email_hmac_sha256` | Keyed SHA-256 identifier generated from the normalized contact email. The local key is never committed. |
| `official_website` | Restaurant-owned website used for verification where available. |
| `campaign_status` | Current campaign state, including Zoho scheduling or sent status. |
| `scheduled_date`, `sent_date`, `zoho_message_id` | Audit fields for outreach state. |

> Raw email addresses, outreach bodies, attachments, and the keyed-hash secret are deliberately excluded from this public repository.
