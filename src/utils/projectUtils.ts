import { Context } from "probot";

// Extract issue number from branch name (e.g., feat/123, fix/123)
export function extractIssueFromBranch(branchName: string): number | null {
  // Match patterns like feat/123, fix/123, feature/123, etc.
  const regex = /(?:feat|fix|feature|bugfix|hotfix)\/(\d+)/i;
  const match = branchName.match(regex);
  return match ? parseInt(match[1], 10) : null;
}

// Extract related issues from PR body
export function extractIssueNumbers(prBody: string): number[] {
  const issueNumbers: number[] = [];
  // Match patterns like "Issue #123" (case insensitive)
  const regex = /Issue\s+#(\d+)/gi;
  let match;

  while ((match = regex.exec(prBody)) !== null) {
    issueNumbers.push(parseInt(match[1], 10));
  }

  return issueNumbers;
}

// Get status option ID from env based on status name
export function getStatusOptionId(statusName: string): string | null {
  const statusNameUpper = statusName.toUpperCase();
  const envKey = `STATUS_${statusNameUpper}_OPTION_ID`;
  return process.env[envKey] || null;
}

// Update issue status in project board
export async function updateIssueStatusInProject(
  context: Context,
  owner: string,
  repo: string,
  issueNumber: number,
  newStatus: string,
): Promise<boolean> {
  try {
    const projectId = process.env.PROJECT_ID;
    const statusFieldId = process.env.STATUS_FIELD_ID;
    const statusOptionId = getStatusOptionId(newStatus);

    if (!projectId || !statusFieldId || !statusOptionId) {
      console.warn(
        `⚠️ Missing required environment variables: PROJECT_ID=${projectId}, STATUS_FIELD_ID=${statusFieldId}, statusOptionId=${statusOptionId}`,
      );
      return false;
    }

    // Query to get the issue and its ProjectV2Item
    const query = `query($owner:String!, $repo:String!, $issueNumber:Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) {
          id
          projectItems(first: 10) {
            nodes {
              id
              project {
                id
              }
            }
          }
        }
      }
    }`;

    const result = await context.octokit.graphql(query, {
      owner,
      repo,
      issueNumber,
    });

    const issue = (result as any)?.repository?.issue;
    const projectItems = issue?.projectItems?.nodes || [];
    let projectItemId = null;

    // Find the project item that matches our PROJECT_ID
    for (const item of projectItems) {
      if (item.project.id === projectId) {
        projectItemId = item.id;
        break;
      }
    }

    // If issue not in project, add it first
    if (!projectItemId) {
      console.log(
        `⏭️ Issue #${issueNumber} not in project ${projectId}, adding it...`,
      );

      const addMutation = `mutation($input: AddProjectV2ItemByIdInput!) {
        addProjectV2ItemById(input: $input) {
          item {
            id
          }
        }
      }`;

      const addResult = await context.octokit.graphql(addMutation, {
        input: {
          projectId,
          contentId: issue?.id,
        },
      });

      projectItemId = (addResult as any)?.addProjectV2ItemById?.item?.id;

      if (!projectItemId) {
        console.error(`❌ Failed to add issue #${issueNumber} to project`);
        return false;
      }

      console.log(`✅ Added issue #${issueNumber} to project`);
    }

    // Update the item's status field
    const updateMutation = `mutation($input: UpdateProjectV2ItemFieldValueInput!) {
      updateProjectV2ItemFieldValue(input: $input) {
        clientMutationId
      }
    }`;

    await context.octokit.graphql(updateMutation, {
      input: {
        projectId,
        itemId: projectItemId,
        fieldId: statusFieldId,
        value: {
          singleSelectOptionId: statusOptionId,
        },
      },
    });

    console.log(
      `✅ Updated issue #${issueNumber} status to "${newStatus}" in project`,
    );
    return true;
  } catch (error) {
    console.error(`❌ Error updating issue status:`, error);
    return false;
  }
}
