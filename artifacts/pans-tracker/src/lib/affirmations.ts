export const AFFIRMATIONS: string[] = [
  "You showed up for your child today. That matters more than you know.",
  "PANS is treatable. Many children reach full remission. You are not alone in this fight.",
  "One hard day does not erase the progress you have made.",
  "The fact that you are tracking, advocating, and fighting for answers is extraordinary parenting.",
  "Other parents have walked this exact road and come out the other side. So will you.",
  "You did not cause this. You cannot always control it. But you are doing everything right.",
  "Recovery is not linear, but it is real, and it happens every day for PANS families.",
  "The love driving your advocacy is your child's greatest medicine.",
  "Small progress is still progress. Don't compare this journey to anyone else's.",
  "You are building knowledge and strength that will help families who come after yours.",
  "Rest is not giving up. Taking care of yourself is part of taking care of them.",
  "Every doctor's appointment, every log entry, every phone call — it all adds up to something real.",
];

/** Returns a stable affirmation index for today (changes at midnight). */
export function getTodayAffirmationIndex(): number {
  return Math.floor(Date.now() / 86_400_000) % AFFIRMATIONS.length;
}
