import type { Ai } from "@cloudflare/ai";

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

export default async (ai: Ai, question: string) => {
	const [dataR, embeddingsR] = await Promise.all([
		ai.run("@cf/baai/bge-base-en-v1.5", { text: [question] }),
		fetch("https://raw.githubusercontent.com/KTibow/skygpt/main/data/embeddings.json"),
	]);
	const embedding = dataR[0];
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
