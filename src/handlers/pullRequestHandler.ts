import { Probot, Context } from "probot";

// Extract related issues from PR body
function extractIssueNumbers(prBody: string): number[] {
  const issueNumbers: number[] = [];
  // Match patterns like "Fixes #123", "Closes #456", "Resolves #789"
  const regex = /(?:Fixes|Closes|Resolves)\s+#(\d+)/gi;
  let match;

  while ((match = regex.exec(prBody)) !== null) {
    issueNumbers.push(parseInt(match[1], 10));
  }

  return issueNumbers;
}

// Get status based on branch
function getStatusForBranch(baseBranch: string): string | null {
  const branch = baseBranch.toLowerCase();
  if (branch === "dev") {
    return "Review";
  }
  if (branch === "main" || branch === "master") {
    return "Done";
  }
  return null;
}

// Update issue status in project board
async function updateIssueStatusInProject(
  context: Context,
  owner: string,
  repo: string,
  issueNumber: number,
  newStatus: string,
): Promise<boolean> {
  try {
    // Query to find the project board and field values
    const query = `query($owner:String!, $repo:String!) {
      repository(owner: $owner, name: $repo) {
        projectsV2(first: 10) {
          nodes {
            id
            fields(first: 20) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
            items(first: 100) {
              nodes {
                id
                content {
                  ... on Issue {
                    number
                  }
                }
              }
            }
          }
        }
      }
    }`;

    const result = await context.octokit.graphql(query, {
      owner,
      repo,
    });

    const projects = (result as any)?.repository?.projectsV2?.nodes || [];

    for (const project of projects) {
      const statusField = project.fields.nodes.find(
        (field: any) => field.name?.toLowerCase() === "status",
      );

      if (!statusField) continue;

      const statusOption = statusField.options.find(
        (option: any) => option.name?.toLowerCase() === newStatus.toLowerCase(),
      );

      if (!statusOption) continue;

      const projectItem = project.items.nodes.find(
        (item: any) => item.content?.number === issueNumber,
      );

      if (!projectItem) continue;

      // Update the item's status
      const mutation = `mutation($input: UpdateProjectV2ItemFieldValueInput!) {
        updateProjectV2ItemFieldValue(input: $input) {
          clientMutationId
        }
      }`;

      await context.octokit.graphql(mutation, {
        input: {
          projectId: project.id,
          itemId: projectItem.id,
          fieldId: statusField.id,
          value: {
            singleSelectOptionId: statusOption.id,
          },
        },
      });

      console.log(
        `✅ Updated issue #${issueNumber} status to "${newStatus}" in project`,
      );
      return true;
    }

    console.warn(`⚠️ Could not find project or status field for issue #${issueNumber}`);
    return false;
  } catch (error) {
    console.error(`❌ Error updating issue status:`, error);
    return false;
  }
}

// Handler for pull request closed
export function setupPullRequestHandler(app: Probot) {
  app.on("pull_request.closed", async (context: Context) => {
    try {
      const payload = context.payload as any;
      const pullRequest = payload.pull_request;
      const action = payload.action;

      // Only process merged or closed PRs
      if (action !== "closed" && !pullRequest.merged) {
        return;
      }

      // Get the base branch
      const baseBranch = pullRequest.base.ref;
      const newStatus = getStatusForBranch(baseBranch);

      if (!newStatus) {
        console.log(`⏭️ Base branch "${baseBranch}" is not tracked`);
        return;
      }

      // Extract related issue numbers from PR body
      const issueNumbers = extractIssueNumbers(pullRequest.body || "");
      if (issueNumbers.length === 0) {
        console.log(
          `⏭️ No related issues found in PR #${pullRequest.number}`,
        );
        return;
      }

      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;

      // Update status for each related issue
      // This will trigger projects_v2_item.edited webhook, which will send Discord message
      for (const issueNumber of issueNumbers) {
        await updateIssueStatusInProject(
          context,
          owner,
          repo,
          issueNumber,
          newStatus,
        );
      }
    } catch (error) {
      console.error("❌ Error processing pull request:", error);
    }
  });
}
