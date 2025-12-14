import { execFileSync } from "child_process";
import type { GiteaClient } from "../api/client";
import { fetchPullRequest, fetchIssue, fetchIssueComments, fetchPullRequestFiles } from "../api/queries/gitea";
import {
  isIssueCommentEvent,
  isPullRequestReviewEvent,
  isPullRequestReviewCommentEvent,
  type ParsedGitHubContext,
} from "../context";
import type {
  GitHubComment,
  GitHubFile,
  GitHubIssue,
  GitHubPullRequest,
  GitHubReview,
  IssueQueryResponse,
  PullRequestQueryResponse,
} from "../types";
import type { CommentWithImages } from "../utils/image-downloader";
import { downloadCommentImages } from "../utils/image-downloader";

/**
 * Extracts the trigger timestamp from the GitHub webhook payload.
 * This timestamp represents when the triggering comment/review/event was created.
 *
 * @param context - Parsed GitHub context from webhook
 * @returns ISO timestamp string or undefined if not available
 */
export function extractTriggerTimestamp(
  context: ParsedGitHubContext,
): string | undefined {
  if (isIssueCommentEvent(context)) {
    return context.payload.comment.created_at || undefined;
  } else if (isPullRequestReviewEvent(context)) {
    return context.payload.review.submitted_at || undefined;
  } else if (isPullRequestReviewCommentEvent(context)) {
    return context.payload.comment.created_at || undefined;
  }

  return undefined;
}

/**
 * Filters comments to only include those that existed in their final state before the trigger time.
 * This prevents malicious actors from editing comments after the trigger to inject harmful content.
 *
 * @param comments - Array of GitHub comments to filter
 * @param triggerTime - ISO timestamp of when the trigger comment was created
 * @returns Filtered array of comments that were created and last edited before trigger time
 */
export function filterCommentsToTriggerTime<
  T extends { createdAt: string; updatedAt?: string; lastEditedAt?: string },
>(comments: T[], triggerTime: string | undefined): T[] {
  if (!triggerTime) return comments;

  const triggerTimestamp = new Date(triggerTime).getTime();

  return comments.filter((comment) => {
    // Comment must have been created before trigger (not at or after)
    const createdTimestamp = new Date(comment.createdAt).getTime();
    if (createdTimestamp >= triggerTimestamp) {
      return false;
    }

    // If comment has been edited, the most recent edit must have occurred before trigger
    // Use lastEditedAt if available, otherwise fall back to updatedAt
    const lastEditTime = comment.lastEditedAt || comment.updatedAt;
    if (lastEditTime) {
      const lastEditTimestamp = new Date(lastEditTime).getTime();
      if (lastEditTimestamp >= triggerTimestamp) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filters reviews to only include those that existed in their final state before the trigger time.
 * Similar to filterCommentsToTriggerTime but for GitHubReview objects which use submittedAt instead of createdAt.
 */
export function filterReviewsToTriggerTime<
  T extends { submittedAt: string; updatedAt?: string; lastEditedAt?: string },
>(reviews: T[], triggerTime: string | undefined): T[] {
  if (!triggerTime) return reviews;

  const triggerTimestamp = new Date(triggerTime).getTime();

  return reviews.filter((review) => {
    // Review must have been submitted before trigger (not at or after)
    const submittedTimestamp = new Date(review.submittedAt).getTime();
    if (submittedTimestamp >= triggerTimestamp) {
      return false;
    }

    // If review has been edited, the most recent edit must have occurred before trigger
    const lastEditTime = review.lastEditedAt || review.updatedAt;
    if (lastEditTime) {
      const lastEditTimestamp = new Date(lastEditTime).getTime();
      if (lastEditTimestamp >= triggerTimestamp) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Checks if the issue/PR body was edited after the trigger time.
 * This prevents a race condition where an attacker could edit the issue/PR body
 * between when an authorized user triggered Claude and when Claude processes the request.
 *
 * @param contextData - The PR or issue data containing body and edit timestamps
 * @param triggerTime - ISO timestamp of when the trigger event occurred
 * @returns true if the body is safe to use, false if it was edited after trigger
 */
export function isBodySafeToUse(
  contextData: { createdAt: string; updatedAt?: string; lastEditedAt?: string },
  triggerTime: string | undefined,
): boolean {
  // If no trigger time is available, we can't validate - allow the body
  // This maintains backwards compatibility for triggers that don't have timestamps
  if (!triggerTime) return true;

  const triggerTimestamp = new Date(triggerTime).getTime();

  // Check if the body was edited after the trigger
  // Use lastEditedAt if available (more accurate for body edits), otherwise fall back to updatedAt
  const lastEditTime = contextData.lastEditedAt || contextData.updatedAt;
  if (lastEditTime) {
    const lastEditTimestamp = new Date(lastEditTime).getTime();
    if (lastEditTimestamp >= triggerTimestamp) {
      return false;
    }
  }

  return true;
}

type FetchDataParams = {
  giteaClient: GiteaClient;
  repository: string;
  prNumber: string;
  isPR: boolean;
  triggerUsername?: string;
  triggerTime?: string;
};

export type GitHubFileWithSHA = GitHubFile & {
  sha: string;
};

export type FetchDataResult = {
  contextData: GitHubPullRequest | GitHubIssue;
  comments: GitHubComment[];
  changedFiles: GitHubFile[];
  changedFilesWithSHA: GitHubFileWithSHA[];
  reviewData: { nodes: GitHubReview[] } | null;
  imageUrlMap: Map<string, string>;
  triggerDisplayName?: string | null;
};

export async function fetchGitHubData({
  giteaClient,
  repository,
  prNumber,
  isPR,
  triggerUsername,
  triggerTime,
}: FetchDataParams): Promise<FetchDataResult> {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'.");
  }

  let contextData: GitHubPullRequest | GitHubIssue | null = null;
  let comments: GitHubComment[] = [];
  let changedFiles: GitHubFile[] = [];
  let reviewData: { nodes: GitHubReview[] } | null = null;

  try {
    if (isPR) {
      // Fetch PR data using Gitea REST API
      const pr = await fetchPullRequest(giteaClient, owner, repo, parseInt(prNumber));
      const prComments = await fetchIssueComments(giteaClient, owner, repo, parseInt(prNumber));
      const prFiles = await fetchPullRequestFiles(giteaClient, owner, repo, parseInt(prNumber));

      // Transform Gitea PR response to match GitHub GraphQL structure
      contextData = {
        number: pr.number,
        title: pr.title,
        body: pr.body || "",
        state: pr.state,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        author: {
          login: pr.user.login,
        },
        comments: {
          nodes: prComments.map((c: any) => ({
            id: c.id.toString(),
            body: c.body,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            author: {
              login: c.user.login,
            },
          })),
        },
        files: {
          nodes: prFiles.map((f: any) => ({
            path: f.filename,
            additions: f.additions,
            deletions: f.deletions,
            changeType: f.status === "added" ? "ADDED" : f.status === "removed" ? "DELETED" : f.status === "modified" ? "MODIFIED" : "MODIFIED",
          })),
        },
      } as GitHubPullRequest;

      changedFiles = contextData.files.nodes || [];
      comments = filterCommentsToTriggerTime(
        contextData.comments?.nodes || [],
        triggerTime,
      );
      reviewData = { nodes: [] }; // Gitea doesn't have separate review API like GitHub

      console.log(`Successfully fetched PR #${prNumber} data`);
    } else {
      // Fetch issue data using Gitea REST API
      const issue = await fetchIssue(giteaClient, owner, repo, parseInt(prNumber));
      const issueComments = await fetchIssueComments(giteaClient, owner, repo, parseInt(prNumber));

      // Transform Gitea issue response to match GitHub GraphQL structure
      contextData = {
        number: issue.number,
        title: issue.title,
        body: issue.body || "",
        state: issue.state,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        author: {
          login: issue.user.login,
        },
        comments: {
          nodes: issueComments.map((c: any) => ({
            id: c.id.toString(),
            body: c.body,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            author: {
              login: c.user.login,
            },
          })),
        },
      } as GitHubIssue;

      comments = filterCommentsToTriggerTime(
        contextData.comments?.nodes || [],
        triggerTime,
      );

      console.log(`Successfully fetched issue #${prNumber} data`);
    }
  } catch (error) {
    console.error(`Failed to fetch ${isPR ? "PR" : "issue"} data:`, error);
    throw new Error(`Failed to fetch ${isPR ? "PR" : "issue"} data`);
  }

  // Compute SHAs for changed files
  let changedFilesWithSHA: GitHubFileWithSHA[] = [];
  if (isPR && changedFiles.length > 0) {
    changedFilesWithSHA = changedFiles.map((file) => {
      // Don't compute SHA for deleted files
      if (file.changeType === "DELETED") {
        return {
          ...file,
          sha: "deleted",
        };
      }

      try {
        // Use git hash-object to compute the SHA for the current file content
        const sha = execFileSync("git", ["hash-object", file.path], {
          encoding: "utf-8",
        }).trim();
        return {
          ...file,
          sha,
        };
      } catch (error) {
        console.warn(`Failed to compute SHA for ${file.path}:`, error);
        // Return original file without SHA if computation fails
        return {
          ...file,
          sha: "unknown",
        };
      }
    });
  }

  // Prepare all comments for image processing
  const issueComments: CommentWithImages[] = comments
    .filter((c) => c.body && !c.isMinimized)
    .map((c) => ({
      type: "issue_comment" as const,
      id: c.databaseId,
      body: c.body,
    }));

  // Filter review bodies to trigger time
  const filteredReviewBodies = reviewData?.nodes
    ? filterReviewsToTriggerTime(reviewData.nodes, triggerTime).filter(
        (r) => r.body,
      )
    : [];

  const reviewBodies: CommentWithImages[] = filteredReviewBodies.map((r) => ({
    type: "review_body" as const,
    id: r.databaseId,
    pullNumber: prNumber,
    body: r.body,
  }));

  // Filter review comments to trigger time
  const allReviewComments =
    reviewData?.nodes?.flatMap((r) => r.comments?.nodes ?? []) ?? [];
  const filteredReviewComments = filterCommentsToTriggerTime(
    allReviewComments,
    triggerTime,
  );

  const reviewComments: CommentWithImages[] = filteredReviewComments
    .filter((c) => c.body && !c.isMinimized)
    .map((c) => ({
      type: "review_comment" as const,
      id: c.databaseId,
      body: c.body,
    }));

  // Add the main issue/PR body if it has content and wasn't edited after trigger
  // This prevents a TOCTOU race condition where an attacker could edit the body
  // between when an authorized user triggered Claude and when Claude processes the request
  let mainBody: CommentWithImages[] = [];
  if (contextData.body) {
    if (isBodySafeToUse(contextData, triggerTime)) {
      mainBody = [
        {
          ...(isPR
            ? {
                type: "pr_body" as const,
                pullNumber: prNumber,
                body: contextData.body,
              }
            : {
                type: "issue_body" as const,
                issueNumber: prNumber,
                body: contextData.body,
              }),
        },
      ];
    } else {
      console.warn(
        `Security: ${isPR ? "PR" : "Issue"} #${prNumber} body was edited after the trigger event. ` +
          `Excluding body content to prevent potential injection attacks.`,
      );
    }
  }

  const allComments = [
    ...mainBody,
    ...issueComments,
    ...reviewBodies,
    ...reviewComments,
  ];

  const imageUrlMap = await downloadCommentImages(
    giteaClient,
    owner,
    repo,
    allComments,
  );

  // Fetch trigger user display name if username is provided
  let triggerDisplayName: string | null | undefined;
  if (triggerUsername) {
    triggerDisplayName = await fetchUserDisplayName(giteaClient, triggerUsername);
  }

  return {
    contextData,
    comments,
    changedFiles,
    changedFilesWithSHA,
    reviewData,
    imageUrlMap,
    triggerDisplayName,
  };
}

/**
 * Fetch user display name from Gitea
 *
 * @param giteaClient - Authenticated Gitea client
 * @param login - Username to fetch
 * @returns User's full name or null if not found
 */
export async function fetchUserDisplayName(
  giteaClient: GiteaClient,
  login: string,
): Promise<string | null> {
  try {
    const user = await giteaClient.get<any>(`/users/${login}`);
    return user.full_name || null;
  } catch (error) {
    console.warn(`Failed to fetch user display name for ${login}:`, error);
    return null;
  }
}
