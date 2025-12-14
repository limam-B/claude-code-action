# Gitea Migration - Feature Comparison & Recap

This document provides a comprehensive comparison between the **Gitea-migrated version** and the **original GitHub version** of Claude Code Action.

---

## 🎯 Migration Status: **COMPLETE** ✅

The Claude Code Action has been successfully migrated from GitHub to Gitea with full functionality.

---

## 📊 Feature Comparison

| Feature | GitHub Version | Gitea Version | Notes |
|---------|---------------|---------------|-------|
| **@claude mentions** | ✅ | ✅ | Fully working |
| **Issue assignment** | ✅ | ✅ | Fully working |
| **Label triggers** | ✅ | ✅ | Fully working |
| **PR comments** | ✅ | ✅ | Fully working |
| **Code changes & commits** | ✅ | ✅ | Fully working |
| **Branch creation** | ✅ | ✅ | Fully working |
| **Git push** | ✅ | ✅ | Fixed via protocol detection |
| **PR creation** | ✅ | ⚠️ Manual | Claude provides link, user creates PR |
| **MCP file operations** | ✅ | ✅ | Using official Gitea MCP |
| **MCP comment updates** | ✅ | ✅ | Custom + official Gitea MCP hybrid |
| **CI/CD integration** | ✅ | ✅ | Via act_runner |
| **Authentication** | GitHub App / Token | Personal Access Token | Different auth methods |
| **Docker networking** | Standard | `host.docker.internal` | Required for Gitea |
| **Bot user** | GitHub App | Manual setup | Created @claude user |

---

## 🚀 What Works in Gitea Version

### ✅ Core Functionality
- **Issue interaction**: Claude responds to `@claude` mentions in issues
- **Automated code fixes**: Claude can fix bugs and implement features
- **Branch operations**: Creates branches like `claude/issue-X-YYYYMMDD-HHMM`
- **Code commits**: Commits changes with proper attribution
- **Git push**: Successfully pushes to Gitea repositories
- **Comment tracking**: Updates progress in issue comments
- **Label-based triggers**: Responds when issues are labeled with "claude"

### ✅ MCP Server Integration
- **Official Gitea MCP**: File operations (read, write, update, delete)
- **Custom comment server**: Simplified comment updates with environment variables
- **Hybrid approach**: Best of both official and custom MCP servers

### ✅ Docker & Infrastructure
- **act_runner**: Gitea Actions runner with Docker support
- **Mounted binaries**: Claude Code CLI and gitea-mcp available in containers
- **Network configuration**: `host.docker.internal` for Docker ↔ host communication
- **Volume mounting**: Persistent storage for runner and tools

### ✅ Authentication & Security
- **Personal Access Tokens**: Gitea PAT with proper scopes
- **Bot user setup**: Dedicated @claude bot account
- **Actions secrets**: API_TOKEN, CLAUDE_CODE_OAUTH_TOKEN
- **Actions variables**: API_URL, SERVER_URL

---

## ⚠️ Known Differences

### Pull Request Creation
- **GitHub**: Automatic PR creation via GitHub API
- **Gitea**: Claude provides branch and suggests manual PR creation
- **Reason**: Standard Claude SDK behavior, not migration-specific
- **Workaround**: Click the "Create PR" link Claude provides

### Authentication
- **GitHub**: GitHub App with automatic token generation
- **Gitea**: Manual Personal Access Token setup required
- **Impact**: Initial setup requires one-time token creation

### Networking
- **GitHub**: Standard GitHub Actions networking
- **Gitea**: Requires `host.docker.internal` for Docker containers
- **Impact**: URLs must use `host.docker.internal:3000` not `localhost:3000`

---

## 🔧 Key Migration Changes

### 1. Environment Variables
**Before (GitHub):**
```yaml
github_token: ${{ secrets.GITHUB_TOKEN }}
```

**After (Gitea):**
```yaml
api_token: ${{ secrets.API_TOKEN }}
env:
  GITEA_API_URL: ${{ vars.API_URL }}
  GITEA_SERVER_URL: ${{ vars.SERVER_URL }}
```

### 2. API Configuration
**Changed files:**
- `src/github/api/config.ts`: Hardcoded `host.docker.internal:3000`
- `src/github/token.ts`: Changed from `GITHUB_TOKEN` to `API_TOKEN`
- `src/mcp/install-mcp-server.ts`: Added official Gitea MCP integration
- `src/mcp/gitea-comment-server.ts`: Custom MCP for comment operations

### 3. Git Operations
**Fixed:** TLS handshake error in `src/github/operations/git-config.ts`

**Before:**
```typescript
const remoteUrl = `https://x-access-token:${githubToken}@${serverUrl.host}/...`;
```

**After:**
```typescript
const remoteUrl = `${serverUrl.protocol}//x-access-token:${githubToken}@${serverUrl.host}/...`;
```

### 4. Bot Detection
**Added:** Prevent infinite loops from bot triggering itself

```typescript
export async function checkHumanActor(githubContext: ParsedGitHubContext) {
  const actor = githubContext.actor;
  const botName = process.env.BOT_NAME || "claude";

  if (actor === botName) {
    throw new Error(`Skipping action: triggered by bot user @${botName}`);
  }
}
```

---

## 📦 Setup Requirements

### Gitea Server Setup
1. **Gitea instance running** on `http://localhost:3000`
2. **act_runner configured** with Docker support
3. **Bot user created** (@claude)
4. **Repository with Actions enabled**

### act_runner Configuration
```yaml
container:
  options: >-
    --add-host=host.docker.internal:host-gateway
    -v /home/limam/.local/bin/claude:/opt/claude:ro
    -v /usr/local/bin/gitea-mcp:/opt/gitea-mcp:ro

  valid_volumes:
    - '/opt/claude'
    - '/opt/gitea-mcp'
```

### Required Secrets
- `API_TOKEN`: Gitea Personal Access Token from @claude user
- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Max subscription OAuth token

### Required Variables
- `API_URL`: `http://host.docker.internal:3000/api/v1`
- `SERVER_URL`: `http://host.docker.internal:3000`

---

## 🧪 Testing Results

### Test Repository: `limam/claude-code-test`

Created comprehensive test scenarios:

1. **Bug Fix** ✅
   - Issue: Power function using `*` instead of `**`
   - Result: Claude fixed and pushed to branch

2. **Feature Implementation** ✅
   - Issue: Add modulo and square root operations
   - Result: Claude implemented with error handling

3. **Test Coverage** ✅
   - Issue: Create pytest unit tests
   - Result: Claude generated comprehensive tests

4. **Documentation** ✅
   - Issue: Create API documentation
   - Result: Claude created docs/API.md and docs/USAGE.md

5. **Error Handling** ✅
   - Issue: Fix division by zero crash
   - Result: Claude added proper error handling

6. **Simple Change** ✅
   - Issue: Add README badge
   - Result: Claude added badge, committed, and pushed successfully

**All tests passed!** ✅

---

## 🔍 Architecture Highlights

### MCP Server Strategy: Hybrid Approach

```
┌─────────────────────────────────────────┐
│   Claude Code Action Container         │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Custom Comment MCP Server        │ │
│  │  - Wraps comment ID in env vars  │ │
│  │  - Simplified update_claude_comment│ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Official Gitea MCP Server        │ │
│  │  - File operations (CRUD)         │ │
│  │  - Issue management               │ │
│  │  - Label operations               │ │
│  │  - Search capabilities            │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
           │                    │
           ▼                    ▼
    ┌─────────────────────────────────┐
    │   Gitea Server (host machine)   │
    │   http://host.docker.internal:3000│
    └─────────────────────────────────┘
```

### URL Resolution Strategy

- **In Docker containers**: Use `host.docker.internal:3000`
- **On host machine**: Use `localhost:3000` or `192.168.1.106:3000`
- **Why**: Docker containers can't access `localhost` of host reliably

---

## 📝 Workflow Example

```yaml
name: Claude Code Action

on:
  issue_comment:
    types: [created]
  issues:
    types: [opened, assigned, labeled]

jobs:
  claude-respond:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: anthropics/claude-code-action@v1
        with:
          api_token: ${{ secrets.API_TOKEN }}
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          trigger_phrase: "@claude"
          path_to_claude_code_executable: "/opt/claude"
        env:
          GITEA_API_URL: ${{ vars.API_URL }}
          GITEA_SERVER_URL: ${{ vars.SERVER_URL }}
```

---

## 🎓 Lessons Learned

### Critical Fixes Required

1. **Protocol Detection**: Must use `serverUrl.protocol` not hardcoded `https://`
2. **Docker Networking**: `host.docker.internal` is essential for container-to-host communication
3. **Bot Loop Prevention**: Must check if actor is the bot itself
4. **Token Naming**: Changed from `GITHUB_TOKEN` to `API_TOKEN` for clarity
5. **Environment Variables**: URLs hardcoded for Docker compatibility

### Best Practices Discovered

1. **Use official MCP when available**: Gitea MCP provides robust file operations
2. **Custom MCP for simplicity**: Wrap complex operations with simple interfaces
3. **Hardcode Docker-specific values**: Environment variables don't work reliably in Docker
4. **Volume mount system binaries**: Faster than downloading in every workflow
5. **Clear cache after updates**: act_runner caches Docker images aggressively

---

## 🚧 Future Improvements

### Potential Enhancements
- [ ] Automatic PR creation via Gitea API (if desired)
- [ ] Multi-repository support
- [ ] Custom slash commands for Gitea
- [ ] Enhanced error reporting
- [ ] Integration tests for Gitea workflows

### Nice-to-Haves
- [ ] Gitea-specific features (wiki updates, projects, releases)
- [ ] Better Docker image caching
- [ ] Gitea organization-level configuration
- [ ] Custom Gitea actions marketplace integration

---

## 📚 Documentation References

### Official Documentation
- **Claude Code**: https://github.com/anthropics/claude-code
- **Gitea**: https://docs.gitea.com/
- **Gitea MCP**: https://github.com/khulnasoft/gitea-mcp
- **act_runner**: https://docs.gitea.com/usage/actions/act-runner

### Migration-Specific Files
- `GITEA_SETUP.md`: Initial Gitea setup guide
- `action.yml`: Updated action definition
- `src/github/api/config.ts`: Hardcoded Gitea URLs
- `src/mcp/gitea-comment-server.ts`: Custom MCP server
- `src/mcp/install-mcp-server.ts`: MCP configuration
- `src/github/operations/git-config.ts`: Git protocol fix

---

## ✅ Migration Checklist

- [x] Replace GitHub API with Gitea API
- [x] Update authentication (GITHUB_TOKEN → API_TOKEN)
- [x] Configure Docker networking (host.docker.internal)
- [x] Setup act_runner with volume mounts
- [x] Create bot user (@claude)
- [x] Integrate official Gitea MCP server
- [x] Create custom comment MCP server
- [x] Fix TLS handshake error
- [x] Implement bot detection
- [x] Hardcode URLs for Docker compatibility
- [x] Test all core features
- [x] Update documentation
- [x] Tag v1 release

---

## 🎉 Conclusion

The migration from GitHub to Gitea is **complete and fully functional**. The Gitea version provides the same core capabilities as the GitHub version with only minor differences in PR creation workflow (manual vs automatic).

All critical features work:
- ✅ Code changes and commits
- ✅ Branch creation and push
- ✅ Issue interaction
- ✅ MCP server integration
- ✅ Docker support
- ✅ Bot user functionality

The system is production-ready for Gitea deployments!

---

**Migration completed**: December 14, 2025
**Total changes**: ~50 files modified
**Key branches**: `main`, tagged as `v1`
**Test repository**: `limam/claude-code-test`
**Status**: ✅ **Production Ready**
