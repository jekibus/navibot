import { Probot, Context } from "probot";

export default (app: Probot) => {
  app.on("projects_v2_item.edited", async (context: Context) => {
    const payload = context.payload as any;

    console.log(
      "🔔 Received projects_v2_item.edited webhook:",
      JSON.stringify(payload, null, 2),
    );

    // Extract relevant data from the webhook payload
    const item = payload.projects_v2_item;
    const changes = payload.changes;
    const contentNodeId = item?.content_node_id;
    const contentType = item?.content_type;
    const sender = payload.sender?.login;

    console.log("📋 Item details:", {
      id: item?.id,
      content_node_id: contentNodeId,
      content_type: contentType,
    });

    // Only process issues, not pull requests or draft issues
    if (contentType !== "Issue") {
      console.log(`⏭️  Skipping - content type is "${contentType}", not "Issue"`);
      return;
    }

    console.log("🔄 Changes:", JSON.stringify(changes, null, 2));

    // Check if there's a field_value change
    if (changes?.field_value) {
      const fieldChange = changes.field_value;
      const fieldName = fieldChange.field_name;
      const newValue = fieldChange.to;

      console.log("📝 Field value changed to:", newValue);

      // Check if this is a Status field change
      if (fieldName?.toLowerCase() === "status") {
        console.log(`✅ Status field changed to: ${newValue?.name}`);

        // Resolve issue information from node ID
        try {
          console.log(
            `🔍 Resolving issue from node_id: ${contentNodeId}...`,
          );

          const query = `query($nodeId:ID!) {
            node(id: $nodeId) {
              ... on Issue {
                number
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
            return;
          }

          const owner = issue.repository.owner.login;
          const repo = issue.repository.name;
          const issueNumber = issue.number;

          console.log(`📌 Resolved: ${owner}/${repo}#${issueNumber}`);

          // Post comment with status and who changed it
          const commentBody = `Status: ${newValue?.name} (moved by @${sender})`;

          console.log(`💬 Posting comment: "${commentBody}"`);

          await context.octokit.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: commentBody,
          });

          console.log(`✅ Comment posted successfully!`);
        } catch (error) {
          console.error("❌ Error processing status change:", error);
        }
      } else {
        console.log(
          "⏭️  Field change is not a Status field:",
          fieldName,
        );
      }
    } else {
      console.log("⏭️  No field_value change detected");
    }
  });
};
