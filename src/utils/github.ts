import { Context } from "probot";

export interface IssueInfo {
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
}

// Resolve issue information from node ID using GraphQL
export async function resolveIssueInfo(
  context: Context,
  contentNodeId: string,
): Promise<IssueInfo | null> {
  const query = `query($nodeId:ID!) {
    node(id: $nodeId) {
      ... on Issue {
        number
        title
        repository {
          owner {
            login
          }
          name
        }
      }
    }
  }`;

  const result = await context.octokit.graphql(query, {
    nodeId: contentNodeId,
  });

  const issue = (result as any)?.node;
  if (!issue) {
    console.error("❌ Could not resolve issue from node ID");
    return null;
  }

  return {
    owner: issue.repository.owner.login,
    repo: issue.repository.name,
    issueNumber: issue.number,
    issueTitle: issue.title,
  };
}

// Fetch Discord thread ID from issue comments
export async function getDiscordThreadId(
  context: Context,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<string | null> {
  try {
    const comments = await context.octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });

    for (const comment of comments.data) {
      const match = comment.body?.match(/\*\*Discord Thread ID:\*\*\s*\[?(\d+)\]?/);
      if (match) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error("❌ Error fetching Discord thread ID from comments:", error);
    return null;
  }
}

// Update issue status via GraphQL
export async function updateIssueStatus(
  context: Context,
  issueNodeId: string,
  statusFieldId: string,
  statusValueId: string,
): Promise<boolean> {
  const mutation = `mutation($input:UpdateProjectV2ItemFieldValueInput!) {
    updateProjectV2ItemFieldValue(input: $input) {
      clientMutationId
    }
  }`;

  try {
    await context.octokit.graphql(mutation, {
      input: {
        projectId: statusFieldId,
        itemId: issueNodeId,
        fieldId: statusFieldId,
        value: {
          singleSelectOptionId: statusValueId,
        },
      },
    });
    return true;
  } catch (error) {
    console.error("❌ Error updating issue status:", error);
    return false;
  }
}
