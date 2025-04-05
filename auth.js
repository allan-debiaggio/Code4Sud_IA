import { AIProjectsClient } from "@azure/ai-projects";

import { DefaultAzureCredential } from "@azure/identity";



async function runAgentConversation() {

  

const client = AIProjectsClient.fromConnectionString(

  "swedencentral.api.azureml.ms;09134cae-5522-4a7f-9f41-2a860de20aa6;hackathon-1023;aiproject-1023",

  new DefaultAzureCredential()

);

  

const agent = await client.agents.getAgent("asst_EJx4OEb5T7BoNIhyJHxn0wnS");

console.log(`Retrieved agent: ${agent.name}`);

  

const thread = await client.agents.getThread("thread_hNCAq98lNQl3WKFnl3a9YKjf");

console.log(`Retrieved thread, thread ID: ${thread.id}`);

  

const message = await client.agents.createMessage(thread.id, {

  role: "user",

  content: "Hi Vidocq_mini"

});

console.log(`Created message, message ID: ${message.id}`);

  

// Create run

let run = await client.agents.createRun(thread.id, agent.id);


// Poll until the run reaches a terminal status

while (

  run.status === "queued" ||

  run.status === "in_progress"

) {

  // Wait for a second

  await new Promise((resolve) => setTimeout(resolve, 1000));

  run = await client.agents.getRun(thread.id, run.id);

}


console.log(`Run completed with status: ${run.status}`);

  

// Retrieve messages

const messages = await client.agents.listMessages(thread.id);


// Display messages

for (const dataPoint of messages.data.reverse()) {

  console.log(`${dataPoint.createdAt} - ${dataPoint.role}:`);

  for (const contentItem of dataPoint.content) {

    if (contentItem.type === "text") {

      console.log(contentItem.text.value);

    }

  }

}

}



// Main execution

runAgentConversation().catch(error => {

  console.error("An error occurred:", error);

});