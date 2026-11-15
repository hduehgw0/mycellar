"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import {
  createWhisky,
  deleteWhisky,
  updateWhisky,
} from "@/features/whisky/mutations";
import {
  whiskyCreateSchema,
  whiskyUpdateSchema,
} from "@/features/whisky/schema";

export const createWhiskyAction = authActionClient
  .inputSchema(whiskyCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createWhisky(ctx.userId, parsedInput);
    if (result.status === "created") refresh();
    return result;
  });

export const updateWhiskyAction = authActionClient
  .bindArgsSchemas([z.string()])
  .inputSchema(whiskyUpdateSchema)
  .action(async ({ parsedInput, bindArgsParsedInputs: [id], ctx }) => {
    const result = await updateWhisky(ctx.userId, id, parsedInput);
    if (result.status === "updated") refresh();
    return result;
  });

export const deleteWhiskyAction = authActionClient
  .bindArgsSchemas([z.string()])
  .action(async ({ bindArgsParsedInputs: [id], ctx }) => {
    const result = await deleteWhisky(ctx.userId, id);
    if (result.status === "deleted") refresh();
    return result;
  });
