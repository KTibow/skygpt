import { Ai } from "@cloudflare/ai";
import { RoleScopedChatInput } from "@cloudflare/ai/dist/tasks/text-generation";
import { Env } from "./ambient";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	const ai = new Ai(env.AI);
	const { messages }: { messages: RoleScopedChatInput[] } = await request.json();
	const response = await ai.run("@cf/meta/llama-3-8b-instruct", {
		messages,
		stream: true,
	});
	return new Response(response, { headers: { "Content-Type": "text/event-stream" } });
};
