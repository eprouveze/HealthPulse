---
name: task
description: Add a task to Night Shift's autonomous agent queue. Creates a task file in the lex repo that Mac Mini M2 picks up and executes hourly. Use when you want something done autonomously — blog posts, security fixes, cleanup, dependency updates, content creation, pSEO pages, etc. Works from any project directory.
allowed-tools: Read, Write, Bash, Glob, Grep
user-invocable: true
metadata:
  version: "1.0.0"
  author: emmanuel
---

# Night Shift Task Queue

Add tasks to the autonomous agent queue. Tasks are executed by Claude Code on Mac Mini M2, hourly.

## Usage

```
/task <description>
/task list
/task status
```

## How It Works

Parse the argument:

- **No args or `list`** → list pending/running/done task counts and pending filenames
- **`status`** → show last 20 lines of today's Night Shift log from M2
- **Any other text** → create a new task (see below)

## Creating a Task

### Step 1: Detect project

Determine the project from the current working directory:

| CWD contains | Project |
|--------------|---------|
| `MyWritingTwin` | MyWritingTwin |
| `FluxDiagram` | FluxDiagram |
| `calendar-studio` | calendar-studio |
| `website` | website |
| `lex` | lex |
| `spreadpix` | spreadpix |
| `GAM-Forecast-Tool` | GAM-Forecast-Tool |
| other | Ask the user which project |

If the user's description explicitly mentions a different project (e.g. "for FluxDiagram: ..."), use that instead of cwd.

### Step 2: Determine priority

| Keyword in description | Priority |
|----------------------|----------|
| urgent, critical, asap, now | 1 |
| important, high | 2 |
| (default) | 3 |
| low, backlog, later | 4 |
| someday, maybe | 5 |

### Step 3: Check project skills

Before writing the task file, check what skills exist in the target project:

```bash
ls /Users/emmanuel/Documents/Dev/<project>/.claude/skills/ 2>/dev/null
```

If the task involves content creation and the project has content/SEO/media skills, add references to them in the task file. The agent reading this file needs to know which skills to consult.

### Step 4: Create the task file

Write to: `/Users/emmanuel/Documents/Dev/lex/docs/agent-tasks/pending/<date>-<slug>.md`

```markdown
---
project: <detected project>
due: <today YYYY-MM-DD>
priority: <detected priority>
---

# <Task title derived from description>

<User's description, expanded into clear instructions>

## Skills to read
- .claude/skills/<relevant-skill>/SKILL.md
- [list all relevant skills for this task type]

## Requirements
- [specific requirements based on task type]
- After editing each file, immediately git add and git commit
- [for content: include SEO check, hero image, internal links, cross-sell]

## Verify
- [how to verify the task was done correctly]
```

### Step 5: Push to git

```bash
cd /Users/emmanuel/Documents/Dev/lex
git add docs/agent-tasks/pending/<filename>
git commit -m "task: <short summary>"
git push
```

### Step 6: Confirm

Tell the user:
- Task file created: `docs/agent-tasks/pending/<filename>`
- Project: <project>
- Priority: <priority>
- Night Shift will pick it up on the next hourly run
- They can also trigger immediately: `ssh mac-mini-m2 "launchctl kickstart -k gui/$(id -u)/com.goldencorpus.nightshift"`

## Task Types — What to Include

### Blog post
- Target keyword and search interest score if known
- File path for the post (e.g. `content/blog-posts/en/<slug>.mdx`)
- Skills: mwt-content-creator, mwt-media-generator, seo-optimize
- Requirements: hero image, FluxDiagram animation cross-sell, internal links, SEO meta
- Verify: file exists, frontmatter complete, no em-dashes (—)

### Security fix
- Reference the security review report (branch or file path)
- Specific vulnerability to fix
- Skills: review (for post-fix review)
- Verify: build passes, vulnerability no longer present

### pSEO page
- Slug and route structure
- Target keyword
- Skills: mwt-content-creator, seo-optimize
- Verify: page renders, SEO meta complete

### Dependency update
- Run npm audit, fix vulnerabilities
- Verify: npm audit clean, build + tests pass

### Code cleanup
- Specific files or patterns to clean
- Verify: tests pass, no regressions

### Generic
- Clear description of what to do
- Any relevant file paths
- Verify: how to confirm it worked

## Listing Tasks

For `/task list`:

```bash
echo "=== Pending ==="
ls /Users/emmanuel/Documents/Dev/lex/docs/agent-tasks/pending/*.md 2>/dev/null | xargs -I{} basename {} .md
echo "=== Running ==="
ls /Users/emmanuel/Documents/Dev/lex/docs/agent-tasks/running/*.md 2>/dev/null | xargs -I{} basename {} .md
echo "=== Done (last 10) ==="
ls -t /Users/emmanuel/Documents/Dev/lex/docs/agent-tasks/done/*.md 2>/dev/null | head -10 | xargs -I{} basename {} .md
```

## Status Check

For `/task status`:

```bash
ssh -o ConnectTimeout=5 mac-mini-m2 "tail -20 ~/nightshift.log 2>/dev/null || echo 'No log found'"
```
