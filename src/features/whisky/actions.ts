"use server";

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
  .action(({ parsedInput, ctx }) => createWhisky(ctx.userId, parsedInput));

export const updateWhiskyAction = authActionClient
  .bindArgsSchemas([z.string()])
  .inputSchema(whiskyUpdateSchema)
  .action(({ parsedInput, bindArgsParsedInputs: [id], ctx }) =>
    updateWhisky(ctx.userId, id, parsedInput),
  );

export const deleteWhiskyAction = authActionClient
  .bindArgsSchemas([z.string()])
  .action(({ bindArgsParsedInputs: [id], ctx }) =>
    deleteWhisky(ctx.userId, id),
  );
