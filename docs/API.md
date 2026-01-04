# API Reference

Complete reference for all workflows, scripts, and configuration options.

---

## Table of Contents

1. [Workflow Trigger Diagram](#workflow-trigger-diagram)
2. [Reusable Workflows](#reusable-workflows)
3. [Trigger Workflows (Template)](#trigger-workflows-template)
4. [Python Scripts](#python-scripts)
5. [Configuration Schema](#configuration-schema)
6. [TOML Schema](#toml-schema)
7. [Assignment Types](#assignment-types)

---

## Workflow Trigger Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GITHUB EVENTS (Triggers)                        │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                          PR WORKFLOW (Onboarding)                        │
└──────────────────────────────────────────────────────────────────────────┘

PR MERGED
    │
    ├─ first-time-contributor label?
    │  YES → onboard-first-comment-trigger.yml
    │         (post comment asking for Discord/wallet)
    │              │
    │              ▼
    │         PR COMMENT (from PR author)
    │         onboard-first-response-trigger.yml
    │         (validates PR comment, calls reusable-first-onboard-response.yml)
    │              │
    │              ▼
    │         reusable-first-onboard-response.yml
    │         JOB 1: validate
    │         - Verify PR merged + has label
    │         - Check commenter is PR author
    │         - Extract Discord ID and wallet (via env var)
    │              │
    │              ▼
    │         JOB 2: complete-onboarding
    │         Calls → reusable-first-onboard-save.yml
    │              │
    │              ▼
    │         reusable-first-onboard-save.yml
    │         - Configure Git identity
    │         - Create TOML in Gist
    │         - Assign Discord Apprentice role (via Discord API)
    │         - Post success comment
    │              │
    │              ▼
    │         TOML File Created
    │         status.current_role = "Apprentice"
    │
    └─ NO (TOML exists)
       ├─► update-trigger.yml
       │   - Calculate lines changed
       │   - Call reusable-update-registry.yml
       │   - Configure Git identity
       │   - Update PR stats in TOML
       │
       └─► promote-trigger.yml
           - Call reusable-promote.yml
           - Check if 3+ quality PRs
           - Configure Git identity
           - Promote to Sentinel if eligible
           - Swap Discord roles


┌──────────────────────────────────────────────────────────────────────────┐
│                      ISSUE WORKFLOW (Assignment)                         │
└──────────────────────────────────────────────────────────────────────────┘

ISSUE OPENED
    │
    └─► issue-trigger.yml
        └─► reusable-issue-assign.yml
            └─► issue_router.py (check labels)
                │
                ├─ Has "good-first-issue" or "beginner-friendly"?
                │  YES → Routes to APPRENTICES
                │         └─► Comment: "Apprentices can self-assign"
                │
                └─ NO → Routes to SENTINEL (auto-assignment)
                        └─► sentinel_assigner.py
                            ├─ Find available Sentinel (max_concurrent check)
                            ├─ Assign issue on GitHub
                            ├─► gist_manager.py: assign_issue_to_sentinel()
                            │   └─► Add to [[assignments]] array
                            │       with deadline = assigned_at + 5 days
                            └─► Comment with deadline + labels issue


ISSUE ASSIGNED (Manual by Maintainer)
    │
    └─► manual-assign-trigger.yml
        └─► reusable-manual-assign.yml
            ├─► contributor_checker.py (check if contributor exists)
            │   │
            │   ├─ Contributor exists (TOML found)?
            │   │  YES → Configure Git identity
            │   │         └─► gist_manager.py: add_manual_assignment()
            │   │             └─► Add to [[manual_assignments]] array
            │   │                 (no deadline, tracked but not monitored)
            │   │
            │   └─ NO → Comment: "Not a registered contributor"
            │           (assignment not tracked)


ISSUE UNLABELED (Triage Workflow)
    │
    └─ Label removed = "triage-needed"?
       YES → triage-removal-trigger.yml
             └─► reusable-triage-removal.yml
                 ├─► Fetch issue to check assignees
                 │   │
                 │   └─ Has assignees?
                 │      YES → contributor_checker.py (check if exists)
                 │            │
                 │            └─ Exists?
                 │               YES → Configure Git identity
                 │                     └─► gist_manager.py: add_manual_assignment()
                 │                         └─► Add to [[manual_assignments]] array
                 │                         (tracks post-triage assignments)
                 │
                 └─ NO assignees → Skip


┌──────────────────────────────────────────────────────────────────────────┐
│                    HEALTH CHECK (Monitoring)                             │
└──────────────────────────────────────────────────────────────────────────┘

SCHEDULE (daily) OR MANUAL TRIGGER
    │
    └─► health-trigger.yml
        └─► reusable-health-check.yml
            └─► health_check.py
                │
                ├─► Loop through ALL Sentinels (global scan)
                │   └─► For each Sentinel: loop through [[assignments]] only
                │       (ignores [[manual_assignments]])
                │       │
                │       ├─ Issue closed? → Remove from [[assignments]]
                │       │                  Update status.assigned if no remaining issues
                │       │                  (Sentinel becomes available for new assignments)
                │       │
                │       ├─ Deadline in 3 days? → Send individual warning to Discord DM
                │       │
                │       └─ Overdue? → Free Sentinel, reassign or escalate issue
                │
                └─► Generate health report artifact (summary of all actions)
```


**Example Scenarios for health checker:**

*Scenario 1: Alice completes on time*
- Day 0: Issue #10 assigned to Alice, deadline Day 5
- Day 2: Health check → No action (not urgent yet)
- Day 3: Alice closes issue #10
- Day 3 (health check): Detects closed → Removes from [[assignments]] → Alice available for new work

*Scenario 2: Bob gets warning*
- Day 0: Issue #20 assigned to Bob, deadline Day 5
- Day 2: Health check → Sends warning DM to Bob (3 days remaining)
- Day 4: Bob still working
- Day 5: Bob closes issue → Removed next health check

*Scenario 3: Carol has no assignments*
- Health check runs → Carol has empty [[assignments]] → No action
- New issue #30 opened → `issue-trigger.yml` finds Carol available → Assigns to Carol

*Scenario 4: Dave goes overdue*
- Day 0: Issue #40 assigned to Dave, deadline Day 5
- Day 2: Warning sent
- Day 5+: Health check → Overdue → Removes from Dave's [[assignments]] → Marks Dave as available → Reassigns #40 to another Sentinel or escalates to Knights

---

## Reusable Workflows

These workflows live in `aossie/contributor-automation` and are called by trigger workflows in each project.

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

**Secrets:** `GIST_PAT`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_APPRENTICE_ROLE_ID`

**Called by:** `reusable-first-onboard-response.yml`

**Important:** Configures Git identity before committing to Gist:
```bash
git config --global user.email "github-actions[bot]@users.noreply.github.com"
git config --global user.name "GitHub Actions Bot"
```

---

### 2. reusable-first-onboard-response.yml

**Purpose:** Validate user response and extract Discord ID + wallet from comment

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `issue_number` | number | ✅ | PR number |
| `repo_name` | string | ✅ | Repository name |
| `comment_body` | string | ✅ | Comment text to parse |
| `commenter` | string | ✅ | Username who commented |

**Secrets:** `GIST_PAT`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_APPRENTICE_ROLE_ID`

**Permissions:**
- `issues: write` - Post validation error comments
- `pull-requests: write` - Access PR data and comment on PRs

**Called by:** `onboard-first-response-trigger.yml`

**Logic:**
1. Validates PR is merged and has `first-time-contributor` label
2. Checks commenter is PR author
3. Extracts Discord ID and wallet using regex (passed via environment variable to handle special characters)
4. Calls `reusable-first-onboard-save.yml` if valid

**Implementation Notes:**
- Uses two jobs: `validate` (extracts data) → `complete-onboarding` (calls nested reusable workflow)
- `comment_body` passed via environment variable to safely handle special characters like backticks

---

### 3. reusable-update-registry.yml

**Purpose:** Update contributor statistics after PR merge

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pr_number` | number | ✅ | Pull request number |
| `repo_name` | string | ✅ | Repository name |
| `pr_author` | string | ✅ | PR author username |
| `lines_changed` | number | ✅ | Total lines changed (additions + deletions) |
| `pr_labels` | string | ✅ | PR labels (JSON array) |

**Secrets:** `GIST_PAT`

**Called by:** `update-trigger.yml`

**Important:** Configures Git identity before committing to Gist. Only processes if contributor is already onboarded.

---

### 4. reusable-promote.yml

**Purpose:** Check and execute promotion to Sentinel

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pr_number` | number | ✅ | Pull request number |
| `repo_name` | string | ✅ | Repository name |
| `pr_author` | string | ✅ | PR author username |

**Secrets:** `GIST_PAT`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_APPRENTICE_ROLE_ID`, `DISCORD_SENTINEL_ROLE_ID`

**Called by:** `promote-trigger.yml`

**Important:** Configures Git identity before committing to Gist. Swaps Discord roles (removes Apprentice, adds Sentinel).

---

### 5. reusable-issue-assign.yml

**Purpose:** Route issues to Apprentices or Sentinels

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `issue_number` | number | ✅ | Issue number |
| `repo_name` | string | ✅ | Repository name |
| `issue_labels` | string | ✅ | Labels (JSON array) |

**Secrets:** `GIST_PAT`, `DISCORD_BOT_TOKEN`

**Called by:** `issue-trigger.yml`

---

### 6. reusable-manual-assign.yml

**Purpose:** Track manual issue assignments by maintainers

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `issue_number` | number | ✅ | Issue number |
| `repo_name` | string | ✅ | Repository name |
| `assignee` | string | ✅ | Assignee username |
| `assigned_at` | string | ✅ | Assignment timestamp |

**Secrets:** `GIST_PAT`

**Called by:** `manual-assign-trigger.yml`

**Logic:**
1. Checks if assignee is existing contributor
2. Configures Git identity if contributor exists
3. Adds to `manual_assignments` array (no deadline)
4. Posts comment if non-contributor assigned

---

### 7. reusable-triage-removal.yml

**Purpose:** Track assignments when triage-needed label is removed

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `issue_number` | number | ✅ | Issue number |
| `repo_name` | string | ✅ | Repository name |
| `label_removed` | string | ✅ | Label name that was removed |

**Secrets:** `GIST_PAT`

**Called by:** `triage-removal-trigger.yml`

**Logic:**
1. Only processes if `label_removed == 'triage-needed'`
2. Checks if issue is assigned
3. Configures Git identity if assignee is contributor
4. Adds to `manual_assignments` if assignee is contributor

---

### 8. reusable-health-check.yml

**Purpose:** Monitor Sentinel assignments and enforce deadlines

**Inputs:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repo_name` | string | ❌ | Specific repo to check (optional) |

**Secrets:** `GIST_PAT`, `DISCORD_BOT_TOKEN`

**Called by:** `health-trigger.yml`

**Outputs:** Uploads artifact `health-check-report` with JSON report

**Note:** Only monitors `assignments` array, ignores `manual_assignments`

---

## Trigger Workflows (Template)

These workflows live in each AOSSIE project's `.github/workflows/` folder. They are lightweight triggers that call reusable workflows.

### onboard-first-comment-trigger.yml

**Trigger:** `pull_request.closed` (when merged + first-time-contributor label)

**Flow:**
1. PR merged → Posts comment asking for Discord ID and wallet
2. Uses `github-script` to post formatted comment with instructions

---

### onboard-first-response-trigger.yml

**Trigger:** `issue_comment.created` (on PR comments only)

**Permissions:**
```yaml
permissions:
  issues: write
  pull-requests: write
```

**Flow:**
1. User responds with Discord ID and wallet
2. Calls `reusable-first-onboard-response.yml`
3. Validates and completes onboarding

**Secrets passed explicitly:**
```yaml
secrets:
  GIST_PAT: ${{ secrets.GIST_PAT }}
  DISCORD_BOT_TOKEN: ${{ secrets.DISCORD_BOT_TOKEN }}
  DISCORD_GUILD_ID: ${{ secrets.DISCORD_GUILD_ID }}
  DISCORD_APPRENTICE_ROLE_ID: ${{ secrets.DISCORD_APPRENTICE_ROLE_ID }}
```

---

### update-trigger.yml

**Trigger:** `pull_request.closed` (when merged, not first-time)

**Flow:**
1. Job `calculate`: Computes lines changed (additions + deletions)
2. Job `update`: Calls `reusable-update-registry.yml`
3. Updates contributor stats in TOML

**Important:** Uses `fromJson()` to convert string output to number:
```yaml
lines_changed: ${{ fromJson(needs.calculate.outputs.lines_changed) }}
```

**Secrets passed explicitly:**
```yaml
secrets:
  GIST_PAT: ${{ secrets.GIST_PAT }}
```

---

### promote-trigger.yml

**Trigger:** `pull_request.closed` (when merged, not first-time)

**Flow:**
1. PR merged → Calls `reusable-promote.yml`
2. Checks promotion eligibility (3+ quality PRs)
3. Promotes to Sentinel if qualified

**Secrets passed explicitly:**
```yaml
secrets:
  GIST_PAT: ${{ secrets.GIST_PAT }}
  DISCORD_BOT_TOKEN: ${{ secrets.DISCORD_BOT_TOKEN }}
  DISCORD_GUILD_ID: ${{ secrets.DISCORD_GUILD_ID }}
  DISCORD_APPRENTICE_ROLE_ID: ${{ secrets.DISCORD_APPRENTICE_ROLE_ID }}
  DISCORD_SENTINEL_ROLE_ID: ${{ secrets.DISCORD_SENTINEL_ROLE_ID }}
```

---

### issue-trigger.yml

**Trigger:** `issues.opened`

**Flow:**
1. Issue opened → Calls `reusable-issue-assign.yml`
2. Routes to Apprentices or assigns to Sentinel

---

### manual-assign-trigger.yml

**Trigger:** `issues.assigned`

**Flow:**
1. Maintainer assigns issue → Calls `reusable-manual-assign.yml`
2. Tracks in `manual_assignments` array

---

### triage-removal-trigger.yml

**Trigger:** `issues.unlabeled`

**Flow:**
1. Label removed → Calls `reusable-triage-removal.yml`
2. If `triage-needed` removed and assigned → Track assignment

---

### health-trigger.yml

**Trigger:** `schedule.cron` (daily at midnight UTC) or `workflow_dispatch`

**Recommended cron:** `0 0 * * *` (runs every day at 00:00 UTC)

**Why daily?**
- Sentinel deadlines are 5 days
- Warnings sent 3 days before deadline
- Running every 5 days would miss the 3-day warning window

**Flow:**
1. Runs health check on all Sentinels
2. Sends warnings for assignments due in 3 days
3. Frees Sentinels and reassigns/escalates overdue issues

---

## Assignment Types

### 1. Auto-Assignment (System Controlled)
- **How:** System finds available Sentinel via `reusable-issue-assign.yml`
- **Storage:** `[[assignments]]` array with deadline
- **Monitoring:** Health check enforces deadline
- **Outcome:** Automatic reassignment if overdue

### 2. Manual Assignment (Maintainer Controlled)
- **How:** Maintainer assigns via GitHub UI or after triage
- **Storage:** `[[manual_assignments]]` array (no deadline)
- **Monitoring:** Health check ignores these
- **Outcome:** Contributor works at own pace, no warnings

---
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
Add auto-assignment to Sentinel (with deadline tracking).

```bash
python gist_manager.py \
  --action assign_issue_to_sentinel \
  --username "alice" \
  --repo-name "aossie/repo" \
  --issue-number 10 \
  --assigned-at "2026-01-03T12:00:00Z" \
  --gist-pat "$GIST_PAT"
```

#### `add_manual_assignment`
Add manual assignment to contributor (no deadline tracking).

```bash
python gist_manager.py \
  --action add_manual_assignment \
  --username "alice" \
  --repo-name "aossie/repo" \
  --issue-number 20 \
  --assigned-at "2026-01-04T08:00:00Z" \
  --gist-pat "$GIST_PAT"
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
  --max-concurrent 1 \
  --output-file sentinel.json
```

**Parameters:**
- `--max-concurrent`: Maximum concurrent issues (auto + manual combined). Default: `1`

**Output:**
```json
{
  "found": true,
  "sentinel_username": "alice",
  "discord_id": "123..."
}
```

**Logic:**
- Checks `total_assignments = len(assignments) + len(manual_assignments)`
- Only returns Sentinels where `total_assignments < max_concurrent`

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

**Purpose:** Monitor Sentinel auto-assignments (ignores manual assignments)

```bash
python health_check.py \
  --gist-pat "$GIST_PAT" \
  --github-token "$GITHUB_TOKEN" \
  --output-file health_report.json
```

**Logic:**
- Only processes `assignments` array (with deadlines)
- Ignores `manual_assignments` array completely
- For each assignment: checks deadline, sends warnings, frees/reassigns if overdue

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

[onboarding]
response_timeout_days = 7
discord_id_length_min = 17
discord_id_length_max = 19
wallet_address_prefix = "0x"
wallet_address_length = 42

[health_check]
interval_days = 1  # Run daily to catch 3-day warnings
reassign_after_days = 5  # Match Sentinel deadline
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
assigned = true  # true if ANY assignment (auto OR manual) exists
current_role = "Sentinel"  # "Apprentice" | "Sentinel"
blocked = false  # Manual flag - set to true to prevent auto-assignments and promotions
                 # Currently must be edited manually in Gist TOML file
                 # Future: Could be automated based on repeated deadline failures

# Auto-assignments (system controlled with deadline tracking)
[[assignments]]
issue_url = "aossie/repo#123"
assigned_at = "2026-01-01T10:00:00Z"
deadline = "2026-01-06T10:00:00Z"
knight_override = false

# Manual assignments (maintainer controlled, no deadline tracking)
[[manual_assignments]]
issue_url = "aossie/repo#456"
assigned_at = "2026-01-02T12:00:00Z"

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
