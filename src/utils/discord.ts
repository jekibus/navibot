export interface IssueInfo {
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
}

// Construct Discord message payload
export function constructDiscordMessage(
  issueInfo: IssueInfo,
  newStatusName: string,
  sender: string,
): any {
  const timestamp = new Date().toISOString();
  const statusEmoji = "📊";

  return {
    embeds: [
      {
        title: issueInfo.issueTitle,
        description: `Status changed to **${newStatusName}**`,
        color: 3447003, // Blue
        author: {
          name: sender,
        },
        fields: [
          {
            name: "Issue",
            value: `#${issueInfo.issueNumber}`,
            inline: true,
          },
          {
            name: "Status",
            value: `${statusEmoji} ${newStatusName}`,
            inline: true,
          },
          {
            name: "Moved by",
            value: sender,
            inline: true,
          },
        ],
        url: `https://github.com/${issueInfo.owner}/${issueInfo.repo}/issues/${issueInfo.issueNumber}`,
        timestamp: timestamp,
      },
    ],
  };
}

// Send message to Discord webhook
export async function sendDiscordMessage(
  webhookUrl: string,
  message: any,
  issueNumber: number,
  threadId?: string,
): Promise<boolean> {
  const url = threadId
    ? `${webhookUrl}?thread_id=${threadId}`
    : webhookUrl;

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
    const errorBody = await response.text();
    console.error("Error body:", errorBody);
    return false;
  }

  console.log(`✅ Discord message sent for issue #${issueNumber}`);
  return true;
}
// Interface for forum thread message construction
export interface ForumThreadMessageData {
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  issueAuthor: string;
  issueUrl: string;
  issueAvatarUrl: string;
  labels: string;
  parentIssue: string | null;
  status: string;
}

// Construct Discord forum thread message for new issue
export function constructForumThreadMessage(
  data: ForumThreadMessageData,
): any {
  const timestamp = new Date().toISOString();
  const fields: any[] = [
    {
      name: "Issue",
      value: `#${data.issueNumber}`,
      inline: true,
    },
    {
      name: "Status",
      value: data.status,
      inline: true,
    },
  ];

  if (data.labels) {
    fields.push({
      name: "Labels",
      value: data.labels,
      inline: true,
    });
  }

  if (data.parentIssue) {
    fields.push({
      name: "Parent Issue",
      value: `#${data.parentIssue}`,
      inline: true,
    });
  }

  return {
    thread_name: `Issue #${data.issueNumber}: ${data.issueTitle}`,
    embeds: [
      {
        title: `Issue #${data.issueNumber}`,
        description: data.issueBody,
        color: 3447003, // Blue
        author: {
          name: data.issueAuthor,
          icon_url: data.issueAvatarUrl,
        },
        fields: fields,
        url: data.issueUrl,
        timestamp: timestamp,
      },
    ],
  };
}

// Interface for comment message construction
export interface CommentMessageData {
  title: string;
  description: string;
  author: string;
  avatarUrl: string;
  issueNumber: number;
  issueTitle: string;
  issueUrl: string;
  color: number;
}

// Construct Discord message for issue comments and assignments
export function constructCommentMessage(
  data: CommentMessageData,
): any {
  const timestamp = new Date().toISOString();

  return {
    embeds: [
      {
        title: data.title,
        description: data.description,
        color: data.color,
        author: {
          name: data.author,
          icon_url: data.avatarUrl,
        },
        fields: [
          {
            name: "Issue",
            value: `#${data.issueNumber}`,
            inline: true,
          },
          {
            name: "Title",
            value: data.issueTitle,
            inline: true,
          },
        ],
        url: data.issueUrl,
        timestamp: timestamp,
      },
    ],
  };
}