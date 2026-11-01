import { z } from "zod";

export const CreateDraft = z
  .object({
    sport: z.literal("NFL"),
    experience: z.enum(["BEGINNER", "PRO"]),
    app: z.enum(["espn", "yahoo", "sleeper", "other"]),
    teams: z.number().int().min(2).max(20),
    myPosition: z.number().int().min(1),
    scoring: z.enum(["std", "half", "ppr"]),
    snake: z.boolean().default(true),
    rounds: z.number().int().min(1).max(30).default(15),
  })
  .refine((d) => d.myPosition <= d.teams, { path: ["myPosition"], message: "must be at most teams" });

export const LogPick = z.object({
  playerId: z.string().min(1),
  team: z.number().int().min(1).optional(),
});
