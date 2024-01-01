import fs from "fs/promises";

const apiUrl = "https://wiki.hypixel.net/api.php"; // Replace with the actual URL of your wiki's API
const maxPageSize = 500; // Adjust this based on your wiki's API configuration
const headers = {
  Cookie: `cf_clearance=tpEm83VFL0QhQaoqglsyC7YKSphdco3U9vFHU27E9Iw-1704133337-0-2-478d5804.34a5c36b.108c07e4-160.0.0; xfNew_csrf=He6JnwqfjXhght3W; xfNew_user=5110162%2CJ7MceJ1Btqtj-vZsnf25sJdBoS190LMLmm2PGS0f; xfNew_session=0stMbKG22QTy6Aa4nHAM0J9ma7h32Xn1; __cf_bm=gd_fdT9F7.znmI2pTp02yf1WIy94YAnmE9gDB_0JbYo-1704133462-1-AZs5CWYesVNI++SnSZEwDsWiK8vgu2HPTMkvzf9PQkooT6m7mQpYfMTFOyaS9h36dgDZ4trYpSktBLGffB3F2/M=`,
  "User-Agent": `Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0`,
};

let lastRequest = 0;
const patchedFetch = async (url, options = {}) => {
  while (lastRequest + 500 > Date.now()) {
    await new Promise((resolve) => {
      setTimeout(resolve, lastRequest + 500 - Date.now());
    });
  }
  lastRequest = Date.now();

  let resp = await fetch(url, { ...options, headers });
  if (resp.status == 429) {
    console.log("slowing for 429...");
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
    resp = await fetch(url, { ...options, headers });
  }
  return resp;
};

// Function to fetch page content using the MediaWiki API
async function getPageContent(pageTitle) {
  const params = new URLSearchParams({
    action: "parse",
    page: pageTitle,
    format: "json",
    formatversion: 2,
    prop: "wikitext|text",
  });
  const response = await patchedFetch(`${apiUrl}?${params}`);
  if (!response.ok) console.log("error", response.status);
  return await response.json();
}

// Function to get a list of all pages on the wiki with pagination support
async function getAllPagesWithPagination() {
  let allPages = [];
  let continueToken = null;

  do {
    console.log(
      `loading pages${continueToken ? ` ${continueToken.charAt(0)}` : ""}...`
    );
    const params = `action=query&list=allpages&aplimit=${maxPageSize}&format=json${
      continueToken ? `&apcontinue=${encodeURIComponent(continueToken)}` : ""
    }`;
    const response = await patchedFetch(`${apiUrl}?${params}`);
    const data = await response.json();

    if (data.query && data.query.allpages) {
      allPages = allPages.concat(data.query.allpages.map((page) => page.title));
    }

    continueToken = data.continue?.apcontinue;
  } while (continueToken);

  return allPages;
}

let allPages = await getAllPagesWithPagination();
allPages = allPages.filter((page) => !page.startsWith("&"));
allPages = allPages.filter((page) => page > "Pam");

const worker = async () => {
  let page;
  while ((page = allPages.shift())) {
    const { parse } = await getPageContent(page);
    console.log(page);
    if (parse.wikitext.includes("REDIRECT")) continue;

    console.log(parse.text);
    console.log("=".repeat(50));
    await fs.writeFile(
      "pages/" + page.replaceAll("/", "_"),
      parse.text,
      "utf8"
    );
  }
};

await Promise.all([worker(), worker(), worker(), worker()]);
