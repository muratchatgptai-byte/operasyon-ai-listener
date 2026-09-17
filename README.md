# Operasyon AI Listener

Node.js 20 Slack Socket Mode listener for Railway.

## Railway variables
Required:
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

Optional:
- `ALLOWED_USER_ID` (defaults to the configured Murat Slack user ID)

Do not commit Slack tokens to this repository.

## Test
After Railway deploys successfully, DM Operasyon AI with `Test Railway` and check Railway runtime logs for an `allowed_dm` JSON entry.
