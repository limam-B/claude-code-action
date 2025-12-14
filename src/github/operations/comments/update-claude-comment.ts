import type { GiteaClient } from "../../api/client";

export type UpdateClaudeCommentParams = {
  owner: string;
  repo: string;
  commentId: number;
  body: string;
  isPullRequestReviewComment: boolean;
};

export type UpdateClaudeCommentResult = {
  id: number;
  html_url: string;
  updated_at: string;
};

/**
 * Updates a Claude comment on Gitea (issue/PR comments)
 *
 * @param giteaClient - Authenticated Gitea client
 * @param params - Parameters for updating the comment
 * @returns The updated comment details
 * @throws Error if the update fails
 */
export async function updateClaudeComment(
  giteaClient: GiteaClient,
  params: UpdateClaudeCommentParams,
): Promise<UpdateClaudeCommentResult> {
  const { owner, repo, commentId, body } = params;

  // Gitea uses the same API for all comment types
  const response = await giteaClient.patch(
    `/repos/${owner}/${repo}/issues/comments/${commentId}`,
    { body },
  );

  return {
    id: response.id,
    html_url: response.html_url,
    updated_at: response.updated_at,
  };
}
