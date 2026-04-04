---
name: unfreeze
version: 1.0.0
description: |
  Remove the freeze boundary set by /freeze. Allows edits to all directories again.
  Use when asked to "unfreeze", "unlock edits", "remove edit restriction", or
  "allow all edits".
allowed-tools:
  - Bash
---

# /unfreeze — Remove Edit Restrictions

Remove the freeze boundary and allow edits to all directories.

```bash
rm -f "$HOME/.claude/freeze-dir.txt"
echo "Freeze boundary removed. Edits are now unrestricted."
```

Tell the user: "Edit restrictions removed. You can now edit files in any directory."
