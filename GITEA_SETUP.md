# Gitea Setup Instructions

## Prerequisites

1. **Gitea instance** running with Actions enabled
2. **Gitea Actions runner** configured and running
3. **Claude Max subscription** (for OAuth token) OR Anthropic API key

## Step 1: Create Gitea Personal Access Token

1. Go to your Gitea instance: `http://localhost:3000`
2. Click your profile → **Settings** → **Applications**
3. Under "Generate New Token", create a token with these permissions:
   - ✅ `repo` (all repository permissions)
   - ✅ `write:issue`
   - ✅ `write:pull_request`
4. Copy the token (you won't see it again!)

## Step 2: Get Claude Code OAuth Token

Since you have Claude Max, get your OAuth token:

1. Open terminal and run: `claude auth login`
2. Follow the login flow
3. Run: `cat ~/.claude/auth.json`
4. Copy the `oauth_token` value

## Step 3: Add Secrets to Your Gitea Repository

1. Go to your test repository in Gitea
2. Click **Settings** → **Secrets** (or **Actions** → **Secrets**)
3. Add these secrets:
   - **REPO_ACCESS_TOKEN**: Your personal access token from Step 1
   - **CLAUDE_OAUTH_TOKEN**: Your OAuth token from Step 2

**Note**: Don't use `GITEA_` or `GITHUB_` prefix for secret names - Gitea reserves these.

**Note**: If you prefer to use pay-per-use API instead, use `ANTHROPIC_API_KEY` secret and change the workflow to use `anthropic_api_key` input.

## Step 4: Copy the Workflow File

The workflow is already created at:

```
.gitea/workflows/test-claude-action.yml
```

If you need to adjust the Gitea URL, edit the `env` section in the workflow.

## Step 5: Push to Your Gitea Repository

```bash
# Add the workflow file
git add .gitea/workflows/test-claude-action.yml

# Commit
git commit -m "Add Claude Code Action test workflow"

# Push to Gitea
git push
```

## Step 6: Test the Action

### Test 1: Issue Comment

1. Create an issue in your Gitea repository
2. Add a comment: `@claude please help with this`
3. Go to **Actions** tab
4. Watch the workflow run
5. Claude should respond in the issue comments

### Test 2: Pull Request

1. Create a new branch
2. Make some changes
3. Create a pull request
4. Add a comment: `@claude review this PR`
5. Watch Claude respond

## Troubleshooting

### Check Workflow Logs

1. Go to **Actions** tab in your repository
2. Click on the failed workflow run
3. Expand each step to see detailed logs
4. Share any errors with me!

### Common Issues

**Action not triggering:**

- Check that secrets are set correctly
- Verify Gitea Actions runner is running
- Check workflow file syntax

**Authentication errors:**

- Verify `GITEA_TOKEN` is correct
- Check token has required permissions
- Ensure `GITEA_API_URL` matches your instance

**API errors:**

- Check Gitea API URL is correct
- Verify Gitea version is compatible (v1.19+)
- Check network connectivity from runner to Gitea

## Environment Variables

You can customize these in the workflow file:

```yaml
env:
  GITEA_API_URL: "http://localhost:3000/api/v1"
  GITEA_SERVER_URL: "http://localhost:3000"
```

## Next Steps

Once the basic test works, you can:

- Customize the trigger phrase
- Add more event types
- Configure different modes (tag vs agent)
- Use it in real workflows!
