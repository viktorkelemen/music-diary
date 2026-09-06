import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const entries = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/entries" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    // Page still builds at /entry/<slug>, but is kept off the home page,
    // pagination, tags, calendar, RSS and sitemap, and is marked noindex.
    unlisted: z.boolean().optional(),
    videoUrl: z.union([z.string().url(), z.array(z.string().url())]).optional(),
    audioUrl: z
      .union([
        z.string().url(),
        z.array(
          z.union([
            z.string().url(),
            z.object({
              url: z.string().url(),
              label: z.string().optional(),
              group: z.string().optional(),
            }),
          ])
        ),
      ])
      .optional(),
    moodboard: z
      .array(
        z.discriminatedUnion("type", [
          z.object({
            type: z.literal("image"),
            src: z.string(),
            caption: z.string().optional(),
            url: z.string().url().optional(),
          }),
          z.object({
            type: z.literal("link"),
            url: z.string(),
            title: z.string(),
          }),
          z.object({
            type: z.literal("youtube"),
            url: z.string(),
            title: z.string(),
          }),
        ])
      )
      .optional(),
  }),
});

export const collections = { entries };
