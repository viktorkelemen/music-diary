import type { CollectionEntry } from "astro:content";
export function isRecording(entry: CollectionEntry<"entries">): boolean {
  if (entry.data.tags?.includes("reflection")) return false;
  return Boolean(entry.data.audioUrl || entry.data.videoUrl);
}
export function isExperiment(entry: CollectionEntry<"entries">): boolean {
  return (entry.data.tags ?? []).some((tag) => ["firmware", "code", "dsp", "cv", "patch", "patch-log", "patching", "feedback", "generative", "generative-art"].includes(tag)) || /patching|patch notes|firmware|cv lab/i.test(entry.data.title);
}
export function entryKind(entry: CollectionEntry<"entries">): string {
  if (entry.data.tags?.includes("reflection")) return "Reflection";
  if (entry.data.tags?.includes("firmware")) return "Firmware";
  if (entry.data.tags?.includes("code") || entry.data.tags?.includes("dsp")) return "Code / experiment";
  if (isExperiment(entry)) return "Patch study";
  if (isRecording(entry)) return "Recording";
  return "Notes";
}
