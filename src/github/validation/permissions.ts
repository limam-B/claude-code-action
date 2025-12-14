import * as core from "@actions/core";
import type { ParsedGitHubContext } from "../context";

/**
 * Check if the actor has write permissions to the repository
 *
 * SIMPLIFIED FOR GITEA: In a local single-user setup with full control,
 * we bypass all permission checks for simplicity.
 *
 * @param context - The GitHub context
 * @param allowedNonWriteUsers - Comma-separated list of users (unused in Gitea mode)
 * @param githubTokenProvided - Whether token was provided (unused in Gitea mode)
 * @returns Always true for Gitea (single-user local setup)
 */
export async function checkWritePermissions(
  context: ParsedGitHubContext,
  allowedNonWriteUsers?: string,
  githubTokenProvided?: boolean,
): Promise<boolean> {
  const { actor } = context;

  core.info(`Gitea mode: Bypassing permission check for actor: ${actor}`);
  core.info(`Single-user local setup - all users have full access`);

  // In Gitea local setup, always allow
  return true;
}
