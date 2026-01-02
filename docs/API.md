# API Reference

Complete reference for all workflows, scripts, and configuration options.

## Reusable Workflows

### 1. reusable-onboard.yml

**Purpose:** Complete onboarding after user provides Discord ID and wallet

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pr_number` | number | ✅ | Pull request number |
| `repo_name` | string | ✅ | Repository name (owner/repo) |
| `pr_author` | string | ✅ | PR author username |
| `discord_id` | string | ✅ | Discord user ID (17-20 digits) |
| `wallet` | string | ✅ | Wallet address (0x... 42 chars) |
| `lines_changed` | number | ✅ | Total lines changed in first PR |

**Secrets:**
- `GIST_PAT`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_APPRENTICE_ROLE_ID`

**Outputs:** None

**Usage:**
```yaml
jobs:
  onboard:
    uses: aossie/contributor-automation/.github/workflows/reusable-onboard.yml@main
    with:
      pr_number: 123
      repo_name: "aossie/my-project"
      pr_author: "alice"
      discord_id: "123456789012345678"
      wallet: "0x1234567890abcdef1234567890abcdef12345678"
      lines_changed: 150
    secrets: inherit
```

**Note:** This workflow is typically called by `onboard-response-trigger.yml` after user provides info, not directly.

---

### 2. reusable-update-registry.yml

**Purpose:** Update contributor statistics after PR merge

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pr_number` | number | ✅ | Pull request number |
| `repo_name` | string | ✅ | Repository name |
| `pr_author` | string | ✅ | PR author username |
| `lines_changed` | number | ✅ | Total lines changed (additions + deletions) |
| `pr_labels` | string | ✅ | PR labels (JSON array) |

**Secrets:**
- `GIST_PAT`

---

### 3. reusable-promote.yml

**Purpose:** Check and execute promotion to Sentinel

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pr_number` | number | ✅ | Pull request number |
| `repo_name` | string | ✅ | Repository name |
| `pr_author` | string | ✅ | PR author username |

**Secrets:**
- `GIST_PAT`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_APPRENTICE_ROLE_ID`
- `DISCORD_SENTINEL_ROLE_ID`

---

### 4. reusable-issue-assign.yml

**Purpose:** Route issues to Apprentices or Sentinels

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `issue_number` | number | ✅ | Issue number |
| `repo_name` | string | ✅ | Repository name |
| `issue_labels` | string | ✅ | Labels (JSON array) |

**Secrets:**
- `GIST_PAT`
- `DISCORD_BOT_TOKEN`

---

### 5. reusable-health-check.yml

**Purpose:** Monitor Sentinel assignments and enforce deadlines

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repo_name` | string | ❌ | Specific repo to check (optional) |

**Secrets:**
- `GIST_PAT`
- `DISCORD_BOT_TOKEN`

**Outputs:** Uploads artifact `health-check-report` with JSON report

---

## Python Scripts

### 1. contributor_checker.py

**Purpose:** Check contributor existence and eligibility

**Actions:**

#### `check_exists`
Check if contributor TOML exists.

```bash
python contributor_checker.py \
  --action check_exists \
  --pr-author "alice" \
  --gist-pat "$GIST_PAT" \
  --output-file result.json
```

**Output:**
```json
{
  "exists": true,
  "toml_data": { ... },
  "filepath": "/tmp/contributor__alice.toml"
}
```

#### `check_promotion`
Check if contributor eligible for Sentinel.

```bash
python contributor_checker.py \
  --action check_promotion \
  --pr-author "alice" \
  --gist-pat "$GIST_PAT" \
  --output-file promo.json
```

**Output:**
```json
{
  "exists": true,
  "eligible_for_promotion": true,
  "current_role": "Apprentice",
  "pr_count": 3,
  "discord_id": "123..."
}
```

---

### 2. gist_manager.py

**Purpose:** CRUD operations on Gist TOML files

**Actions:**

#### `create`
Create new contributor TOML.

```bash
python gist_manager.py \
  --action create \
  --gist-pat "$GIST_PAT" \
  --username "alice" \
  --discord-id "123..." \
  --wallet "0x..." \
  --repo-name "aossie/repo" \
  --pr-number 1 \
  --lines-changed 150
```

#### `update_pr`
Add PR to contributor history.

```bash
python gist_manager.py \
  --action update_pr \
  --gist-pat "$GIST_PAT" \
  --username "alice" \
  --repo-name "aossie/repo" \
  --pr-number 2 \
  --lines-changed 50 \
  --labels '["bug", "enhancement"]' \
  --counts-toward-promotion "true"
```

#### `promote_to_sentinel`
Update role to Sentinel.

```bash
python gist_manager.py \
  --action promote_to_sentinel \
  --gist-pat "$GIST_PAT" \
  --username "alice"
```

#### `assign_issue_to_sentinel`
Mark Sentinel as assigned.

```bash
python gist_manager.py \
  --action assign_issue_to_sentinel \
  --gist-pat "$GIST_PAT" \
  --username "alice" \
  --repo-name "aossie/repo" \
  --issue-number 10 \
  --assigned-at "2026-01-03T12:00:00Z"
```

---

### 3. discord_manager.py

**Purpose:** Discord bot operations

**Actions:**

#### `assign_role`
Assign Discord role to user.

```bash
python discord_manager.py \
  --action assign_role \
  --bot-token "$DISCORD_BOT_TOKEN" \
  --guild-id "$GUILD_ID" \
  --discord-user-id "123..." \
  --role-id "$ROLE_ID"
```

**Note:** Discord role assignment is now done via direct API calls in workflows for simplicity.

#### `remove_role`
Remove Discord role from user.

```bash
python discord_manager.py \
  --action remove_role \
  --bot-token "$DISCORD_BOT_TOKEN" \
  --guild-id "$GUILD_ID" \
  --discord-user-id "123..." \
  --role-id "$ROLE_ID"
```

---

### 4. sentinel_assigner.py

**Purpose:** Find and assign Sentinels to issues

**Actions:**

#### `find_available`
Find random available Sentinel.

```bash
python sentinel_assigner.py \
  --action find_available \
  --gist-pat "$GIST_PAT" \
  --output-file sentinel.json
```

**Output:**
```json
{
  "found": true,
  "sentinel_username": "alice",
  "discord_id": "123..."
}
```

#### `assign_issue`
Assign GitHub issue to Sentinel.

```bash
python sentinel_assigner.py \
  --action assign_issue \
  --repo-name "aossie/repo" \
  --issue-number 10 \
  --sentinel-username "alice" \
  --github-token "$GITHUB_TOKEN"
```

#### `add_deadline_label`
Add deadline label to issue.

```bash
python sentinel_assigner.py \
  --action add_deadline_label \
  --repo-name "aossie/repo" \
  --issue-number 10 \
  --github-token "$GITHUB_TOKEN"
```

---

### 5. health_check.py

**Purpose:** Monitor Sentinel assignments

```bash
python health_check.py \
  --gist-pat "$GIST_PAT" \
  --github-token "$GITHUB_TOKEN" \
  --output-file health_report.json
```

**Output:**
```json
{
  "sentinels_freed": 3,
  "issues_reassigned": 1,
  "issues_escalated": 0,
  "warnings_sent": 2,
  "total_checked": 10
}
```

---

## Configuration Schema

### thresholds.toml

```toml
[promotion]
threshold = 3  # PRs required for Sentinel
min_avg_lines = 10  # Minimum average lines
min_hours_between_prs = 48  # Anti-spam

[sentinel]
deadline_days = 5
extension_allowed = false
use_business_days = true
max_concurrent_issues = 1  # System enforced for auto-assignment

[onboarding]
response_timeout_days = 7
discord_id_length_min = 17
discord_id_length_max = 19
wallet_address_prefix = "0x"
wallet_address_length = 42

[health_check]
interval_days = 5
reassign_after_days = 5
stale_issue_alert_threshold = 2

[rate_limits]
max_onboards_per_day = 10
discord_roles_per_second = 1
gist_max_retries = 3
gist_retry_backoff = [1, 2, 4]

[quality_gates]
min_lines_for_count = 1
exclude_pr_labels = ["dependencies", "automated"]
allowed_merge_branches = ["main", "master", "develop"]

[discord]
apprentice_channel = "apprentices"
sentinel_channel = "sentinels"
knight_channel = "knights"

[gist]
registry_url = "https://gist.github.com/GIST_ID.git"
schema_version = 1
contributor_file_pattern = "contributor__{username}.toml"
```

---

## TOML Schema

### Contributor TOML Structure

```toml
schema_version = 1

[github]
login = "alice"

[discord]
user_id = "123456789012345678"
verified = true

[wallet]
address = "0x1234567890abcdef1234567890abcdef12345678"
verified = false

[stats]
total_prs = 5
avg_lines_changed = 150
issues_resolved = 2
issues_stale = 0

[status]
assigned = true
current_role = "Sentinel"  # "Apprentice" | "Sentinel"
blocked = false

[[assignments]]
issue_url = "aossie/repo#123"
assigned_at = "2026-01-01T10:00:00Z"
deadline = "2026-01-06T10:00:00Z"
manual_assignment = false  # true = maintainer assigned, don't track in health check
knight_override = false

[[prs]]
repo = "aossie/project"
pr_number = 1
lines_changed = 45
labels = ["bug", "first-time-contributor"]
```

---

## Error Handling

All scripts follow this pattern:

```python
try:
    # Operation
    result = do_something()
    write_output_file('output.json', result)
    print("✓ Success")
except Exception as e:
    print(f"✗ Error: {e}")
    write_output_file('output.json', {'error': str(e), 'success': False})
    sys.exit(1)
```

**Exit codes:**
- `0` - Success
- `1` - Error

---

## Versioning

Pin to specific versions in production:

```yaml
uses: aossie/contributor-automation/.github/workflows/reusable-onboard.yml@v1.0.0
```

Available tags:
- `@main` - Latest (unstable)
- `@v1` - Major version 1 (stable)
- `@v1.0.0` - Specific release

---

## Rate Limits

**Discord API:**
- Role assignments: 1/second
- Messages: 5/5seconds per channel
- Global: 50 requests/second

**GitHub API:**
- 5000 requests/hour (authenticated)
- 1000 requests/hour per repo

**Gist API:**
- 60 requests/hour (unauthenticated)
- 5000 requests/hour (authenticated)

---

## Support

Questions? Open an issue at: https://github.com/aossie/contributor-automation/issues
