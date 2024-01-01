import "dotenv/config";
import fs from "fs/promises";

const run = async (model, input) => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.ACCOUNT_ID}/ai/run/${model}`,
    {
      headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  const json = await response.json();
  if (!response.ok) {
    throw new Error("error running model", { cause: json });
  }
  return json.result;
};
const runWithRetry = async (model, input) => {
  let tries = 0;
  while (true) {
    try {
      return await run(model, input);
    } catch (e) {
      tries++;
      if (tries == 6) {
        if (input.text.length > 1) {
          throw e;
        } else {
          input.text[0] = input.text[0].slice(0, 1300);
        }
      }
      if (tries == 7) throw e;
    }
  }
};

const clean = (text) => {
  text = text.replace(/\s+$/g, "").replace(/\n{2,}/g, "\n\n");
  text = text.slice(0, 1500);
  const fractionSpecial = [...text].filter((c) => /[^a-zA-Z \n]/.test(c)).length / text.length;
  if (fractionSpecial > 0.1) {
    text = text.slice(0, 1300);
  }
  return text;
};

const docsFiles = await fs.readdir("docs");
const docsEntries = await Promise.all(
  docsFiles.map(async (page) => [page, await fs.readFile("docs/" + page, "utf8")])
);
const output = {};

const worker = async () => {
  while (docsEntries.length) {
    const chunk = docsEntries.splice(0, 25);
    console.log("chunk of", chunk[0][0]);
    let data = [];

    try {
      const response = await runWithRetry("@cf/baai/bge-base-en-v1.5", {
        text: chunk.map(([page, text]) => clean(text)),
      });
      data = response.data;
    } catch (e) {
      console.log("failed due to", e.cause.errors);
      console.log("reprocessing...");
      for (const [page, text] of chunk) {
        console.log("reprocessing", page);
        let response;
        try {
          response = await runWithRetry("@cf/baai/bge-base-en-v1.5", {
            text: [clean(text)],
          });
        } catch (e) {
          throw new Error(`failed to reprocess ${page}`, { cause: e.cause.errors });
        }
        data.push(...response.data);
      }
    }

    for (let i = 0; i < data.length; i++) {
      const name = chunk[i][0];
      output[name] = data[i];
    }
    await fs.writeFile("embeddings.json", JSON.stringify(output), "utf8");
  }
};

await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
