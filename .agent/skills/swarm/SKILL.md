---
name: swarm
description: Fan out N parallel interactive Claude sessions in tmux panes — visible simultaneously in Warp. Use for inbox triage, code review, multi-project audits, research sprints, council debates, content pipelines, or any task that benefits from parallel human-in-the-loop Claude sessions. Trigger phrases — "swarm", "fan out", "parallel sessions", "tmux triage", "open multiple claudes", "review these in parallel", "spin up sessions for each".
allowed-tools: Read, Write, Bash, Glob, Grep
user-invocable: true
metadata:
  version: "1.0.0"
  author: emmanuel
---

# Swarm — Parallel Interactive Claude Sessions

Fan out N interactive Claude Code sessions in tmux panes. Each session gets specific homework.
You see all of them simultaneously and can interact with each one.

## Usage

```
/swarm <mode> [args]
```

### Modes

- **`/swarm inbox`** — one pane per inbox item for triage
- **`/swarm review`** — one pane per pending PR for review
- **`/swarm audit <project1> <project2> ...`** — one pane per project for cross-project audit
- **`/swarm research "<topic1>" "<topic2>" ...`** — one pane per research topic
- **`/swarm custom "<prompt1>" "<prompt2>" ...`** — arbitrary prompts, one per pane
- **No args** — interactive: ask what to fan out

## How It Works

### Step 1: Parse the mode and build task list

Each mode produces a list of `{ pane_name, prompt }` pairs.

**inbox mode:**
1. Read `docs/inbox.md` in the lex repo
2. Parse each item (separated by `---` or `## Item N`)
3. For each item, build a triage prompt:
   ```
   You are Lex, Emmanuel's AI cofounder operating from the lex repo at /Users/emmanuel/Documents/Dev/lex.

   Triage this inbox item:
   [item content]

   Steps:
   1. If there's a URL, fetch it with WebFetch for full context
   2. Present an executive summary (detailed — arguments, examples, specifics)
   3. Analyze relevance to Golden Corpus projects
   4. Recommend Act / Park / Discard with reasoning
   5. Wait for Emmanuel's decision before taking any action
   ```

**review mode:**
1. Run `gh pr list --label agent-work --json number,title,headRefName` across goldencorpus repos
2. For each PR, build a review prompt:
   ```
   You are Lex reviewing PR #N: [title] on branch [branch].
   Review the diff, check for quality issues, and present:
   1. What the PR does
   2. Quality assessment (code, tests, collateral damage)
   3. Approve / Request Changes / Close recommendation
   Wait for Emmanuel's decision.
   ```

**audit mode:**
1. For each project name, resolve to `/Users/emmanuel/Documents/Dev/<project>`
2. Build an audit prompt:
   ```
   You are Lex auditing [project]. Working directory: [path].
   Read .claude/project-intel.md first, then check:
   1. CI status (gh run list --limit 3)
   2. Stale dependencies (package.json vs latest)
   3. Open issues/PRs
   4. Any uncommitted changes
   Present a health report. Wait for instructions.
   ```

**research mode:**
1. For each topic string, create a pane:
   ```
   You are Lex researching: [topic].
   Use WebSearch and WebFetch to gather comprehensive information.
   Present a structured briefing with key findings, relevance to Golden Corpus, and recommended actions.
   ```

**custom mode:**
1. Each quoted argument becomes a pane prompt directly.

### Step 2: Calculate layout

- **1 task** → single pane (fullscreen)
- **2 tasks** → side by side (split-h)
- **3 tasks** → 2 top + 1 bottom (split-h then split-v on left)
- **4 tasks** → 2x2 grid (tiled)
- **5-6 tasks** → 3x2 grid (tiled)
- **7+ tasks** → tiled layout, warn that panes will be small

### Step 3: Create tmux session

```bash
SESSION_NAME="swarm-$(date +%H%M)"

# Create session with first pane
tmux new-session -d -s "$SESSION_NAME" -x 200 -y 50

# Add remaining panes
for i in $(seq 2 $N); do
  if [ $i -le $(( N / 2 + 1 )) ]; then
    tmux split-window -h -t "$SESSION_NAME"
  else
    tmux split-window -v -t "$SESSION_NAME"
  fi
done

# Even out the layout
tmux select-layout -t "$SESSION_NAME" tiled
```

### Step 4: Launch Claude in each pane

For each pane (0 to N-1):
```bash
tmux send-keys -t "$SESSION_NAME.$i" "cd /Users/emmanuel/Documents/Dev/lex && claude \"$PROMPT\"" Enter
```

**CRITICAL**: Launch from `lex` directory so SessionStart hooks fire — this gives each session
the full Lex context: identity, core rules, feedback memories, failure atlas, project-intel.
Without this, sessions are "vanilla Claude" with no institutional memory.

**IMPORTANT**: Escape double quotes in prompts with backslash.
**IMPORTANT**: Each Claude session is fully interactive — Emmanuel can talk to each one.

### Step 5: Open in Warp

```bash
osascript -e '
tell application "Warp" to activate
delay 0.3
tell application "System Events"
    keystroke "t" using command down
    delay 0.5
    keystroke "tmux attach -t '"$SESSION_NAME"'"
    keystroke return
end tell
'
```

If osascript fails (permissions), tell the user:
```
tmux attach -t <session_name>
```

### Step 6: Report

Tell the user:
- Session name
- Number of panes
- What each pane is doing
- How to navigate: click panes, or Ctrl+B then arrow keys
- How to detach: Ctrl+B, d
- How to kill when done: `tmux kill-session -t <session_name>`

## Cleanup

When the user says "kill swarm" or "close swarm":
```bash
tmux kill-session -t <session_name>
```

## Constraints

- Max 8 panes recommended (readability)
- Each pane runs a separate Claude session (Max plan covers it)
- Claude sessions don't share context — each is independent
- The orchestrating session (this one) stays available for other work
