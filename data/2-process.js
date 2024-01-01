import fs from "fs/promises";
import { compile } from "html-to-text";

/**
 * @type {import("html-to-text").HtmlToTextOptions}
 */
const options = {
  wordwrap: null,
  formatters: {
    imageAlt: function (elem, walk, builder, formatOptions) {
      const alt = elem.attribs?.alt;
      if (alt) {
        builder.addInline(`"${alt}"`, { noWordTransform: true });
      }
    },
    tr: function (elem, walk, builder, formatOptions) {
      builder.openBlock(formatOptions);
      let i = 0;
      for (const child of elem.children) {
        if (child.type == "tag") {
          if (i > 0) {
            builder.addInline(" | ");
          }
          i++;
        }
        walk([child], builder);
      }
      builder.closeBlock();
    },
  },
  selectors: [
    { selector: "a", options: { ignoreHref: true } },
    { selector: "img", format: "imageAlt" },
    {
      selector: "tr",
      format: "tr",
      options: { leadingLineBreaks: 0, trailingLineBreaks: 0 },
    },
    { selector: ".navbox", format: "skip" },
  ],
};
const convert = compile(options);

const pages = await fs.readdir("pages");
let i = 0;
for (const page of pages) {
  if (i % 100 == 0) console.log(`${i} / ${pages.length}`);
  i++;

  const text = convert(await fs.readFile("pages/" + page, "utf8"));

  if (text.includes("Redirect to:")) continue;
  await fs.writeFile("docs/" + page, text, "utf8");
}
