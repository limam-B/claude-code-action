// Gitea REST API helpers
// Replaces GitHub GraphQL queries with multiple REST calls

import type { GiteaClient } from "../client";

/**
 * Fetch pull request details from Gitea
 */
export async function fetchPullRequest(
  client: GiteaClient,
  owner: string,
  repo: string,
  index: number,
) {
  return client.get(`/repos/${owner}/${repo}/pulls/${index}`);
}

/**
 * Fetch issue details from Gitea
 */
export async function fetchIssue(
  client: GiteaClient,
  owner: string,
  repo: string,
  index: number,
) {
  return client.get(`/repos/${owner}/${repo}/issues/${index}`);
}

/**
 * Fetch comments for an issue or PR
 * In Gitea, both issues and PRs use the same comment endpoint
 */
export async function fetchIssueComments(
  client: GiteaClient,
  owner: string,
  repo: string,
  index: number,
) {
  return client.get(`/repos/${owner}/${repo}/issues/${index}/comments`);
}

/**
 * Fetch changed files in a PR
 */
export async function fetchPullRequestFiles(
  client: GiteaClient,
  owner: string,
  repo: string,
  index: number,
) {
  return client.get(`/repos/${owner}/${repo}/pulls/${index}/files`);
}

/**
 * Fetch repository details
 */
export async function fetchRepository(
  client: GiteaClient,
  owner: string,
  repo: string,
) {
  return client.get(`/repos/${owner}/${repo}`);
}

/**
 * Fetch branch details
 */
export async function fetchBranch(
  client: GiteaClient,
  owner: string,
  repo: string,
  branch: string,
) {
  const data = await client.get<any>(
    `/repos/${owner}/${repo}/branches/${branch}`,
  );

  // Map Gitea's commit.id to commit.sha for compatibility
  if (data.commit && data.commit.id) {
    data.commit.sha = data.commit.id;
  }

  return data;
}

/**
 * Create a comment on an issue or PR
 */
export async function createComment(
  client: GiteaClient,
  owner: string,
  repo: string,
  index: number,
  body: string,
) {
  return client.post(`/repos/${owner}/${repo}/issues/${index}/comments`, {
    body,
  });
}

/**
 * Update a comment
 */
export async function updateComment(
  client: GiteaClient,
  owner: string,
  repo: string,
  commentId: number,
  body: string,
) {
  return client.patch(`/repos/${owner}/${repo}/issues/comments/${commentId}`, {
    body,
  });
}

/**
 * Get user details
 */
export async function fetchUser(client: GiteaClient, username: string) {
  return client.get(`/users/${username}`);
}
