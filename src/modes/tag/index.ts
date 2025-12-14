import * as core from "@actions/core";
import type { Mode, ModeOptions, ModeResult } from "../types";
import { checkContainsTrigger } from "../../github/validation/trigger";
import { checkHumanActor } from "../../github/validation/actor";
import { createInitialComment } from "../../github/operations/comments/create-initial";
import { setupBranch } from "../../github/operations/branch";
import { configureGitAuth } from "../../github/operations/git-config";
import { prepareMcpConfig } from "../../mcp/install-mcp-server";
import {
  fetchGitHubData,
  extractTriggerTimestamp,
} from "../../github/data/fetcher";
import { createPrompt, generateDefaultPrompt } from "../../create-prompt";
import { isEntityContext } from "../../github/context";
import type { PreparedContext } from "../../create-prompt/types";
import type { FetchDataResult } from "../../github/data/fetcher";
import { parseAllowedTools } from "../agent/parse-tools";

/**
 * Tag mode implementation.
 *
 * The traditional implementation mode that responds to @claude mentions,
 * issue assignments, or labels. Creates tracking comments showing progress
 * and has full implementation capabilities.
 */
export const tagMode: Mode = {
  name: "tag",
  description: "Traditional implementation mode triggered by @claude mentions",

  shouldTrigger(context) {
    // Tag mode only handles entity events
    if (!isEntityContext(context)) {
      return false;
    }
    return checkContainsTrigger(context);
  },

  prepareContext(context, data) {
    return {
      mode: "tag",
      githubContext: context,
      commentId: data?.commentId,
      baseBranch: data?.baseBranch,
      claudeBranch: data?.claudeBranch,
    };
  },

  getAllowedTools() {
    return [];
  },

  getDisallowedTools() {
    return [];
  },

  shouldCreateTrackingComment() {
    return true;
  },

  async prepare({
    context,
    octokit,
    giteaClient,
    githubToken,
  }: ModeOptions): Promise<ModeResult> {
    // Tag mode only handles entity-based events
    if (!isEntityContext(context)) {
      throw new Error("Tag mode requires entity context");
    }

    // Check if actor is human
    await checkHumanActor(context);

    // Create initial tracking comment
    const commentData = await createInitialComment(giteaClient, context);
    const commentId = commentData.id;

    const triggerTime = extractTriggerTimestamp(context);

    const githubData = await fetchGitHubData({
      giteaClient,
      repository: `${context.repository.owner}/${context.repository.repo}`,
      prNumber: context.entityNumber.toString(),
      isPR: context.isPR,
      triggerUsername: context.actor,
      triggerTime,
    });

    // Setup branch
    const branchInfo = await setupBranch(giteaClient, githubData, context);

    // Configure git authentication if not using commit signing
    if (!context.inputs.useCommitSigning) {
      // Use bot_id and bot_name from inputs directly
      const user = {
        login: context.inputs.botName,
        id: parseInt(context.inputs.botId),
      };

      try {
        await configureGitAuth(githubToken, context, user);
      } catch (error) {
        console.error("Failed to configure git authentication:", error);
        throw error;
      }
    }

    // Create prompt file
    const modeContext = this.prepareContext(context, {
      commentId,
      baseBranch: branchInfo.baseBranch,
      claudeBranch: branchInfo.claudeBranch,
    });

    await createPrompt(tagMode, modeContext, githubData, context);

    const userClaudeArgs = process.env.CLAUDE_ARGS || "";
    const userAllowedMCPTools = parseAllowedTools(userClaudeArgs).filter(
      (tool) => tool.startsWith("mcp__github_"),
    );

    // Build claude_args for tag mode with required tools
    // Tag mode REQUIRES these tools to function properly
    const tagModeTools = [
      "Edit",
      "MultiEdit",
      "Glob",
      "Grep",
      "LS",
      "Read",
      "Write",
      // Use custom comment server (wraps comment ID in env vars)
      "mcp__github_comment__update_claude_comment",
      // Official Gitea MCP for file operations
      "mcp__gitea__get_file_content",
      ...userAllowedMCPTools,
    ];

    // Add git commands when not using commit signing
    if (!context.inputs.useCommitSigning) {
      tagModeTools.push(
        "Bash(git add:*)",
        "Bash(git commit:*)",
        "Bash(git push:*)",
        "Bash(git status:*)",
        "Bash(git diff:*)",
        "Bash(git log:*)",
        "Bash(git rm:*)",
      );
    } else {
      // When using commit signing, use Gitea MCP file operations tools
      tagModeTools.push(
        "mcp__gitea__create_file",
        "mcp__gitea__update_file",
        "mcp__gitea__delete_file",
      );
    }

    // Get our GitHub MCP servers configuration
    const ourMcpConfig = await prepareMcpConfig({
      githubToken,
      owner: context.repository.owner,
      repo: context.repository.repo,
      branch: branchInfo.claudeBranch || branchInfo.currentBranch,
      baseBranch: branchInfo.baseBranch,
      claudeCommentId: commentId.toString(),
      allowedTools: Array.from(new Set(tagModeTools)),
      mode: "tag",
      context,
    });

    // Build complete claude_args with multiple --mcp-config flags
    let claudeArgs = "";

    // Add our GitHub servers config
    const escapedOurConfig = ourMcpConfig.replace(/'/g, "'\\''");
    claudeArgs = `--mcp-config '${escapedOurConfig}'`;

    // Add required tools for tag mode
    claudeArgs += ` --allowedTools "${tagModeTools.join(",")}"`;

    // Append user's claude_args (which may have more --mcp-config flags)
    if (userClaudeArgs) {
      claudeArgs += ` ${userClaudeArgs}`;
    }

    core.setOutput("claude_args", claudeArgs.trim());

    return {
      commentId,
      branchInfo,
      mcpConfig: ourMcpConfig,
    };
  },

  generatePrompt(
    context: PreparedContext,
    githubData: FetchDataResult,
    useCommitSigning: boolean,
  ): string {
    const defaultPrompt = generateDefaultPrompt(
      context,
      githubData,
      useCommitSigning,
    );

    // If a custom prompt is provided, inject it into the tag mode prompt
    if (context.githubContext?.inputs?.prompt) {
      return (
        defaultPrompt +
        `

<custom_instructions>
${context.githubContext.inputs.prompt}
</custom_instructions>`
      );
    }

    return defaultPrompt;
  },

  getSystemPrompt() {
    // Tag mode doesn't need additional system prompts
    return undefined;
  },
};
