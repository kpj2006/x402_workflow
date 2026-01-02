# Setup Guide for AOSSIE Contributor Automation

This guide helps you integrate the AOSSIE contributor automation system into your project repository.

## Prerequisites

- Your repository must be part of the AOSSIE org
- Secrets must be configured (see Secrets Configuration section below)
- Git installed locally
- Python 3.11+ (for local testing)

### Required Secrets (For Any Option Above)

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `GIST_PAT` | Personal Access Token with `gist` scope | [GitHub Settings](https://github.com/settings/tokens) → Generate classic token → Select `gist` scope |
| `DISCORD_BOT_TOKEN` | Discord bot token | [Discord Developer Portal](https://discord.com/developers/applications) → Your App → Bot → Reset Token |
| `DISCORD_GUILD_ID` | Discord server ID | Enable Developer Mode → Right-click server → Copy Server ID |
| `DISCORD_APPRENTICE_ROLE_ID` | Apprentice role ID | Right-click role → Copy Role ID |
| `DISCORD_SENTINEL_ROLE_ID` | Sentinel role ID | Right-click role → Copy Role ID |

### Setting Repository Secrets (by maintainer or admin)

1. Go to your repository settings: `https://github.com/AOSSIE-Org/YOUR_REPO/settings/secrets/actions`
2. Click "New repository secret"
3. Add each secret from the table above