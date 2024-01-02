import { Ai } from "@cloudflare/ai";
import { RoleScopedChatInput } from "@cloudflare/ai/dist/tasks/text-generation";
import { Env } from "./ambient";

const cosineSimilarity = (vector1: number[], vector2: number[]) => {
	let dotProduct = 0;
	let magnitude1 = 0;
	let magnitude2 = 0;

	for (let i = 0; i < vector1.length; i++) {
		dotProduct += vector1[i] * vector2[i];
		magnitude1 += vector1[i] ** 2;
		magnitude2 += vector2[i] ** 2;
	}

	magnitude1 = Math.sqrt(magnitude1);
	magnitude2 = Math.sqrt(magnitude2);

	if (magnitude1 === 0 || magnitude2 === 0) {
		return 0; // Handle zero magnitude to avoid division by zero
	}

	return dotProduct / (magnitude1 * magnitude2);
};

const clarify = async (ai: Ai, context: RoleScopedChatInput[], question: string) => {
	const { response } = await ai.run("@cf/mistral/mistral-7b-instruct-v0.1", {
		messages: [
			...context,
			{
				role: "user",
				content: `My next question is "${question}". I'm going to search for relevant info with an embedding database, but you need to transform it first.
	If I use any words like "it", "them", etc, you need to edit them to make it more explicit what it's referring to. This will help with searching for relevant info.
	If not, just output the original question.
	When you output the question, do NOT output any other text, including extra words, formatting, or quotes. The only thing you say is the transformed question.`,
			},
		],
	});
	return response;
};

const search = async (ai: Ai, question: string) => {
	const [dataR, embeddingsR] = await Promise.all([
		ai.run("@cf/baai/bge-base-en-v1.5", { text: [question] }),
		fetch("https://raw.githubusercontent.com/KTibow/skygpt/main/data/embeddings.json"),
	]);
	const embedding = dataR.data[0];
	const embeddings: Record<string, number[]> = await embeddingsR.json();

	const embeddingsSimilarity: Record<string, number> = {};
	for (const page in embeddings) {
		const vector = embeddings[page];
		const similarity = cosineSimilarity(vector, embedding);
		embeddingsSimilarity[page] = similarity;
	}

	const sorted = Object.entries(embeddingsSimilarity).sort((a, b) => b[1] - a[1]);
	return sorted.map(([page, similarity]) => page);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	const ai = new Ai(env.AI);
	let { context, question }: { context?: RoleScopedChatInput[]; question: string } =
		await request.json();

	question = context ? await clarify(ai, context, question) : question;

	const relevantDocuments = await search(ai, question);
	return Response.json(relevantDocuments.slice(0, 3));
};
