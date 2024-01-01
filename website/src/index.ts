import { Ai } from "@cloudflare/ai";

import clarify from "./clarify";
import search from "./search";

export interface Env {
	AI: any;
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const ai = new Ai(env.AI);

		// 		const result = await clarify(
		// 			ai,
		// 			[
		// 				{ role: "user", content: "tell me a joke" },
		// 				{
		// 					role: "system",
		// 					content: `Why did the bazaar flipper name his dog "Instant Sell"?
		// Because he got it for a loss!`,
		// 				},
		// 			],
		// 			"why is the dog called that?"
		// 		);
		const result = await search(ai, "why is the dog called that?");
		return Response.json(result);
	},
};
