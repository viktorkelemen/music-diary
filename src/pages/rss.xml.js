import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";
import { toExcerpt } from "../lib/excerpt";

export async function GET(context) {
  const entries = (await getCollection("entries")).filter((e) => !e.data.unlisted);
  entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: entries.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      description: toExcerpt(entry.body ?? "", 300),
      link: `/entry/${entry.id}`,
      categories: entry.data.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
