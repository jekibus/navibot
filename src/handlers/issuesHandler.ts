import { Probot, Context } from "probot";
import {
  constructForumThreadMessage,
  constructCommentMessage,
} from "../utils/discord.js";

// Helper function to extract parent issue number from issue body
function extractParentIssue(body: string): string | null {
  const match = body.match(/Parent issue:\s*#(\d+)/i);
  return match ? match[1] : null;
}

// Helper function to store Discord thread ID in issue comment
async function storeThreadIdInIssue(
  context: Context<"issues.opened">,
  threadId: string,
  serverId: string,
): Promise<void> {
  const payload = context.payload as any;
  const threadUrl = `https://discord.com/channels/${serverId}/${threadId}`;
  await context.octokit.issues.createComment({
    issue_number: payload.issue.number,
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    body: `**Discord Thread ID:** [${threadId}](${threadUrl})`,
  });
}

// Helper function to retrieve Discord thread ID from issue comments
async function getThreadIdFromIssue(
  context: Context<"issues.assigned" | "issue_comment.created">,
): Promise<string | null> {
  const payload = context.payload as any;
  const comments = await context.octokit.issues.listComments({
    issue_number: payload.issue.number,
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
  });

  for (const comment of comments.data) {
    const match = comment.body?.match(/\*\*Discord Thread ID:\*\*\s*\[?(\d+)\]?/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Helper function to post to Discord forum
async function postToDiscordForum(
  message: any,
  webhookUrl: string,
  threadId?: string,
): Promise<string | null> {
  const url = threadId ? `${webhookUrl}?thread_id=${threadId}` : webhookUrl;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    console.error(
      `❌ Discord webhook failed: ${response.status} ${response.statusText}`,
    );
    return null;
  }

  const responseData = await response.json();
  // Extract thread_id from response (for new forum posts)
  return responseData.channel_id || threadId || null;
}

// Handle issue opened event
async function handleIssueOpened(
  context: Context<"issues.opened">,
): Promise<void> {
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
  const discordServerId = process.env.DISCORD_SERVER_ID;

  if (!discordWebhook || !discordServerId) {
    console.warn(
      "Discord webhook or server ID not configured, skipping Discord posting",
    );
    return;
  }

  try {
    const payload = context.payload as any;
    const issue = payload.issue;
    const parentIssue = extractParentIssue(issue.body || "");
    const labels = issue.labels.map((label: any) => label.name).join(", ");

    const message = constructForumThreadMessage({
      issueNumber: issue.number,
      issueTitle: issue.title,
      issueBody: issue.body || "",
      issueAuthor: issue.user.login,
      issueUrl: issue.html_url,
      issueAvatarUrl: issue.user.avatar_url,
      labels,
      parentIssue,
      status: "📋 New",
    });

    const threadId = await postToDiscordForum(
      message,
      discordWebhook,
    );

    if (threadId) {
      console.log(`✅ Discord forum post created with thread ID: ${threadId}`);
      await storeThreadIdInIssue(context, threadId, discordServerId);
    }
  } catch (error) {
    console.error("Error handling issue opened:", error);
  }
}

// Handle issue assigned event
async function handleIssueAssigned(
  context: Context<"issues.assigned">,
): Promise<void> {
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;

  if (!discordWebhook) {
    console.warn("Discord webhook not configured, skipping Discord posting");
    return;
  }

  try {
    const payload = context.payload as any;
    const issue = payload.issue;
    const assignee = payload.assignee;
    const threadId = await getThreadIdFromIssue(context);

    if (!threadId) {
      console.log(
        `No Discord thread found for issue #${issue.number}, skipping notification`,
      );
      return;
    }

    const message = constructCommentMessage({
      title: `Assigned to: ${assignee.login}`,
      description: "",
      author: assignee.login,
      avatarUrl: assignee.avatar_url,
      issueNumber: issue.number,
      issueTitle: issue.title,
      issueUrl: issue.html_url,
      color: 15105570, // Orange
    });

    await postToDiscordForum(message, discordWebhook, threadId);
    console.log(`✅ Assignment notification sent to Discord thread ${threadId}`);
  } catch (error) {
    console.error("Error handling issue assigned:", error);
  }
}

// Handle issue comment event
async function handleIssueComment(
  context: Context<"issue_comment.created">,
): Promise<void> {
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;

  if (!discordWebhook) {
    console.warn("Discord webhook not configured, skipping Discord posting");
    return;
  }

  try {
    const payload = context.payload as any;
    const issue = payload.issue;
    const comment = payload.comment;
    const threadId = await getThreadIdFromIssue(context);

    if (!threadId) {
      console.log(
        `No Discord thread found for issue #${issue.number}, skipping comment notification`,
      );
      return;
    }

    const message = constructCommentMessage({
      title: `Comment by: ${comment.user.login}`,
      description: comment.body,
      author: comment.user.login,
      avatarUrl: comment.user.avatar_url,
      issueNumber: issue.number,
      issueTitle: issue.title,
      issueUrl: comment.html_url,
      color: 9807270, // Purple
    });

    await postToDiscordForum(message, discordWebhook, threadId);
    console.log(
      `✅ Comment notification sent to Discord thread ${threadId}`,
    );
  } catch (error) {
    console.error("Error handling issue comment:", error);
  }
}

export function setupIssuesHandler(app: Probot): void {
  // Handle issue opened events
  app.on("issues.opened", handleIssueOpened);

  // Handle issue assigned events
  app.on("issues.assigned", handleIssueAssigned);

  // Handle issue comment created events
  app.on("issue_comment.created", handleIssueComment);
}
