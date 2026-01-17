import { Probot, Context } from "probot";
import { resolveIssueInfo, getDiscordThreadId } from "../utils/github.js";
import { constructDiscordMessage, sendDiscordMessage } from "../utils/discord.js";

interface PayloadData {
  item: any;
  changes: any;
  contentNodeId: string;
  contentType: string;
  sender: string;
}

interface FieldChange {
  fieldName: string;
  newValue: any;
}

// Extract relevant data from the webhook payload
function extractPayloadData(payload: any): PayloadData {
  return {
    item: payload.projects_v2_item,
    changes: payload.changes,
    contentNodeId: payload.projects_v2_item?.content_node_id,
    contentType: payload.projects_v2_item?.content_type,
    sender: payload.sender?.login,
  };
}

// Validate that the content is an issue (not PR or draft)
function isValidContent(contentType: string): boolean {
  return contentType === "Issue";
}

// Extract field change information
function getFieldChange(changes: any): FieldChange | null {
  if (!changes?.field_value) {
    return null;
  }

  const fieldChange = changes.field_value;
  return {
    fieldName: fieldChange.field_name,
    newValue: fieldChange.to,
  };
}

// Check if the field change is for Status
function isStatusChange(fieldName: string): boolean {
  return fieldName?.toLowerCase() === "status";
}

// Check if the status value is one of the allowed values (case insensitive)
function isAllowedStatus(statusName: string): boolean {
  const allowedStatuses = ["todo", "wip", "review", "rewip", "done"];
  return allowedStatuses.includes(statusName?.toLowerCase());
}

// Handler for projects_v2_item.edited webhook
export function setupProjectsHandler(app: Probot) {
  app.on("projects_v2_item.edited", async (context: Context) => {
    try {
      const payload = context.payload as any;
      const payloadData = extractPayloadData(payload);

      // Only process issues, not pull requests or draft issues
      if (!isValidContent(payloadData.contentType)) {
        return;
      }

      // Check if there's a field_value change
      const fieldChange = getFieldChange(payloadData.changes);
      if (!fieldChange) {
        return;
      }

      // Check if this is a Status field change
      if (!isStatusChange(fieldChange.fieldName)) {
        return;
      }

      // Check if the status value is allowed
      if (!isAllowedStatus(fieldChange.newValue?.name)) {
        console.log(
          `⏭️ Status "${fieldChange.newValue?.name}" is not in the allowed list`,
        );
        return;
      }

      // Resolve issue information from node ID
      const issueInfo = await resolveIssueInfo(
        context,
        payloadData.contentNodeId,
      );
      if (!issueInfo) {
        return;
      }

      // Check if Discord webhook is configured
      const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (!discordWebhookUrl) {
        console.error("❌ DISCORD_WEBHOOK_URL not configured");
        return;
      }

      // Fetch Discord thread ID from issue comments
      const threadId = await getDiscordThreadId(
        context,
        issueInfo.owner,
        issueInfo.repo,
        issueInfo.issueNumber,
      );

      if (!threadId) {
        console.warn(
          `⚠️ No Discord thread ID found for issue #${issueInfo.issueNumber}`,
        );
        return;
      }

      // Construct and send Discord message
      const discordMessage = constructDiscordMessage(
        issueInfo,
        fieldChange.newValue?.name,
        payloadData.sender,
      );
      await sendDiscordMessage(
        discordWebhookUrl,
        discordMessage,
        issueInfo.issueNumber,
        threadId,
      );
    } catch (error) {
      console.error("❌ Error processing status change:", error);
    }
  });
}
