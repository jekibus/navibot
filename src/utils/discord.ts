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
