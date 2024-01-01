import type { Ai } from "@cloudflare/ai";
import type { RoleScopedChatInput } from "@cloudflare/ai/dist/tasks/text-generation";

export default async (ai: Ai, context: RoleScopedChatInput[], question: string) => {
	const messages = [
		...context,
		{
			role: "user",
			content: `My next question is "${question}". I'm going to search for relevant info with an embedding database, but you need to transform it first.
If I use any words like "it", "them", etc, you need to edit them to make it more explicit what it's referring to. This will help with searching for relevant info.
If not, just output the original question.
When you output the question, do NOT output any other text, including extra words, formatting, or quotes. The only thing you say is the transformed question.`,
		},
	];
	const { response } = await ai.run("@cf/mistral/mistral-7b-instruct-v0.1", {
		messages,
	});
	return response;
};
