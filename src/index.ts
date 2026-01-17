import { Probot, Context } from "probot";

const STATUS_FIELD_VALUES = ["todo", "wip", "review", "rewip", "done"];

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

    console.log("📋 Item details:", {
      id: item?.id,
      content_node_id: item?.content_node_id,
      content_type: item?.content_type,
    });

    console.log("🔄 Changes:", JSON.stringify(changes, null, 2));

    // Check if there's a field_value change
    if (changes?.field_value) {
      const fieldChange = changes.field_value;
      const newValue = fieldChange.to;

      console.log("📝 Field value changed to:", newValue);

      // Check if the new value matches any of our status values
      if (
        newValue &&
        typeof newValue === "object" &&
        newValue.name &&
        STATUS_FIELD_VALUES.includes(newValue.name.toLowerCase())
      ) {
        console.log("✅ Status field detected:", newValue.name);

        // TODO: Handle issue information gap
        // We need to get owner, repo, and issue_number to post a comment
        console.log(
          "⚠️  Need to resolve issue information from content_node_id:",
          item?.content_node_id,
        );
      } else {
        console.log(
          "⏭️  Field change is not a status field or no value provided",
        );
      }
    } else {
      console.log("⏭️  No field_value change detected");
    }
  });
};
