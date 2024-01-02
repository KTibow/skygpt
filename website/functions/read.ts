const clean = (text: string) => {
	text = text
		.replace(/\s+$/g, "")
		.replace(/\n{2,}/g, "\n\n")
		.replace(/{{Image\|(?:[^\}]+\/)*([^\}]+)\|[0-9]+px(?:\|link=.+)?}}/g, `"$1"`)
		.replace(/{{Item\/(.+)(?:|is=[0-9]+)?}}/g, "$1");
	if (text.indexOf("|summary") > 1500) {
		const summary = text.match(/^\|summary =([\s\S]+?)(\n\n\||\|body)/m);
		if (summary) {
			text = summary[1].trim() + "\n" + text.replace(summary[0], summary[2]);
		}
	}
	return text;
};

const read = async (pages: string[]) => {
	const params = new URLSearchParams({
		action: "query",
		titles: pages.join("|"),
		format: "json",
		formatversion: "2",
		prop: "revisions",
		rvprop: "content",
	});
	const resp = await fetch(`https://wiki.hypixel.net/api.php?${params}`, {
		headers: {
			"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
		},
	});
	if (!resp.ok) throw new Error(`error ${resp.status}`);

	const { query }: { query: any } = await resp.json();
	return query;
};

export const onRequestPost: PagesFunction = async ({ request }) => {
	const { pages }: { pages: string[] } = await request.json();
	const query = await read(pages);
	return Response.json(
		query.pages
			.sort((a: any, b: any) => pages.indexOf(a.title) - pages.indexOf(b.title))
			.map((page: any) => [page.title, clean(page.revisions[0].content)]),
	);
};
