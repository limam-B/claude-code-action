---
allowed-tools: mcp__gitea__get_pull_request_by_index,mcp__gitea__create_issue_comment,Bash(curl:*)
description: Review a pull request
---

Perform a comprehensive code review using subagents for key areas:

- code-quality-reviewer
- performance-reviewer
- test-coverage-reviewer
- documentation-accuracy-reviewer
- security-code-reviewer

Instruct each to only provide noteworthy feedback. Once they finish, review the feedback and post only the feedback that you also deem noteworthy.

## Available PR Information

Use `mcp__gitea__get_pull_request_by_index` to get:

- PR title, body, state
- Base and head branches (base.ref, head.ref)
- Author information
- Labels, assignees, milestone
- Diff URL (Result.diff_url) - use `curl` to fetch the diff if needed
- Patch URL (Result.patch_url)
- HTML URL for linking

## Posting Feedback

- Use `mcp__gitea__create_issue_comment` for top-level comments (general observations or praise)
- For inline comments on specific code lines, use the inline comment MCP tools (if available)
- Keep feedback concise
- Focus on noteworthy issues only

---
