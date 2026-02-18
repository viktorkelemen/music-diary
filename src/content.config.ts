import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const entries = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/entries" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    videoUrl: z.union([z.string().url(), z.array(z.string().url())]).optional(),
    audioUrl: z.union([z.string().url(), z.array(z.string().url())]).optional(),
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
        ])
      )
      .optional(),
  }),
});

export const collections = { entries };
