/**
 * Image downloader for GitHub-hosted images
 *
 * SIMPLIFIED FOR GITEA: Gitea doesn't use GitHub's private-user-images system
 * or have body_html API responses. Image downloading is disabled for Gitea mode.
 */

import type { GiteaClient } from "../api/client";

type IssueComment = {
  type: "issue_comment";
  id: string;
  body: string;
};

type ReviewComment = {
  type: "review_comment";
  id: string;
  body: string;
};

type ReviewBody = {
  type: "review_body";
  id: string;
  pullNumber: string;
  body: string;
};

type IssueBody = {
  type: "issue_body";
  issueNumber: string;
  body: string;
};

type PullRequestBody = {
  type: "pr_body";
  pullNumber: string;
  body: string;
};

export type CommentWithImages =
  | IssueComment
  | ReviewComment
  | ReviewBody
  | IssueBody
  | PullRequestBody;

/**
 * Download comment images (GITEA: Disabled)
 *
 * Gitea doesn't have GitHub's private image hosting system, so this is a no-op.
 * Images in Gitea are typically hosted externally or in attachments.
 */
export async function downloadCommentImages(
  giteaClient: GiteaClient,
  owner: string,
  repo: string,
  comments: CommentWithImages[],
): Promise<Map<string, string>> {
  console.log(
    "Gitea mode: Image downloading disabled (Gitea doesn't use GitHub's private image hosting)",
  );

  // Return empty map - no images to download in Gitea mode
  return new Map<string, string>();
}
