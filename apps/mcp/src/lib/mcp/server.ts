import {
  presentAssignment,
  presentAssignmentDetail,
  presentGrade,
  presentMessage,
  presentMessageDetail,
  presentScheduleItem,
  presentStudyGuide,
  presentStudyGuideDetail,
} from "@magister/shared/presenters";
import { z } from "zod";

import { createMagisterClient } from "@/lib/magister/repository";
import { MagisterConnectionError } from "@/lib/magister/errors";

import { paginationInput, scheduleInput, validateScheduleRange } from "./schemas";

export interface ToolServer {
  registerTool: (...args: unknown[]) => unknown;
}

interface ToolExtra {
  authInfo?: { extra?: Record<string, unknown> };
}

function getUserId(extra: ToolExtra): string {
  const userId = extra.authInfo?.extra?.userId;
  if (typeof userId !== "string") throw new MagisterConnectionError("INTERNAL_ERROR", "Authenticated user context is missing.");
  return userId;
}

function success(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

function toolError(error: unknown) {
  const known = error instanceof MagisterConnectionError;
  const status = error instanceof Error && "status" in error ? Number((error as Error & { status: number }).status) : undefined;
  const code = known
    ? error.code
    : status === 401
      ? "MAGISTER_AUTH_EXPIRED"
      : status
        ? "MAGISTER_HTTP_ERROR"
        : error instanceof z.ZodError || error instanceof Error && /must|cannot|invalid/i.test(error.message)
          ? "INVALID_ARGUMENT"
          : "INTERNAL_ERROR";
  const message = known || code === "INVALID_ARGUMENT"
    ? error instanceof Error ? error.message : "Invalid input"
    : code === "MAGISTER_AUTH_EXPIRED"
      ? "The Magister session expired. Reconnect it in the dashboard."
      : code === "MAGISTER_HTTP_ERROR"
        ? "Magister returned an upstream error."
        : "The tool could not complete the request.";
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: { code, message } }) }],
    structuredContent: { error: { code, message } },
    isError: true,
  };
}

async function runTool(name: string, extra: ToolExtra, operation: () => Promise<Record<string, unknown>>) {
  const startedAt = Date.now();
  const userId = getUserId(extra);
  try {
    const data = await operation();
    console.info(JSON.stringify({ userId, tool: name, durationMs: Date.now() - startedAt, status: "success" }));
    return success(data);
  } catch (error) {
    const upstreamStatus = error instanceof Error && "status" in error ? (error as Error & { status: number }).status : undefined;
    console.error(JSON.stringify({ userId, tool: name, durationMs: Date.now() - startedAt, status: "error", upstreamStatus }));
    return toolError(error);
  }
}

export function registerMagisterTools(server: ToolServer) {
  server.registerTool("get_account", {
    title: "Get Magister account",
    description: "Return the connected student's account identity.",
    annotations: { readOnlyHint: true },
  }, async (extra: ToolExtra) => runTool("get_account", extra, async () => {
    const client = await createMagisterClient(getUserId(extra));
    const authState = await client.getAuthState();
    return {
      name: authState.name,
      preferredUsername: authState.accountInfo.preferred_username ?? null,
      personId: authState.magisterAccount.Persoon?.Id?.toString() ?? null,
    };
  }));

  server.registerTool("get_schedule", {
    title: "Get schedule",
    description: "Return lessons and appointments in a date range of at most 31 days.",
    inputSchema: scheduleInput,
    annotations: { readOnlyHint: true },
  }, async ({ from, to }: { from: string; to: string }, extra: ToolExtra) => runTool("get_schedule", extra, async () => {
    validateScheduleRange(from, to);
    const client = await createMagisterClient(getUserId(extra));
    const items = await client.getSchedule(await client.getPersonId(), from, to);
    return { from, to, count: items.length, items: items.map(presentScheduleItem) };
  }));

  server.registerTool("get_grades", {
    title: "Get grades",
    description: "Return the latest grade overview for the current school year.",
    inputSchema: { calculatedOnly: z.boolean().optional() },
    annotations: { readOnlyHint: true },
  }, async ({ calculatedOnly }: { calculatedOnly?: boolean }, extra: ToolExtra) => runTool("get_grades", extra, async () => {
    const client = await createMagisterClient(getUserId(extra));
    const result = await client.getLatestGradesOverview(await client.getPersonId(), { onlyCalculatedColumns: calculatedOnly });
    return { schoolYearId: result.schoolYearId, schoolYearEnd: result.schoolYearEnd, count: result.items.length, items: result.items.map(presentGrade) };
  }));

  server.registerTool("list_messages", {
    title: "List messages",
    description: "List inbox messages, newest first.",
    inputSchema: paginationInput,
    annotations: { readOnlyHint: true },
  }, async ({ limit = 12, skip = 0 }: { limit?: number; skip?: number }, extra: ToolExtra) => runTool("list_messages", extra, async () => {
    const client = await createMagisterClient(getUserId(extra));
    const items = await client.getMessages({ top: limit, skip });
    return { skip, limit, count: items.length, items: items.map(presentMessage) };
  }));

  server.registerTool("get_message", {
    title: "Get message",
    description: "Return one inbox message and optionally its attachment metadata.",
    inputSchema: { id: z.number().int().positive(), includeAttachments: z.boolean().optional() },
    annotations: { readOnlyHint: true },
  }, async ({ id, includeAttachments = false }: { id: number; includeAttachments?: boolean }, extra: ToolExtra) => runTool("get_message", extra, async () => {
    const client = await createMagisterClient(getUserId(extra));
    if (includeAttachments) {
      const result = await client.getMessageWithAttachments(id);
      return presentMessageDetail(result.message, result.attachments);
    }
    return presentMessageDetail(await client.getMessage(id));
  }));

  server.registerTool("list_assignments", {
    title: "List assignments",
    description: "List assignments with deadlines and submission state.",
    inputSchema: paginationInput,
    annotations: { readOnlyHint: true },
  }, async ({ limit = 50, skip = 0 }: { limit?: number; skip?: number }, extra: ToolExtra) => runTool("list_assignments", extra, async () => {
    const client = await createMagisterClient(getUserId(extra));
    const items = await client.getAssignments(await client.getPersonId(), { top: limit, skip });
    return { skip, limit, count: items.length, items: items.map(presentAssignment) };
  }));

  server.registerTool("get_assignment", {
    title: "Get assignment",
    description: "Return one assignment with description and attachment metadata.",
    inputSchema: { id: z.number().int().positive() },
    annotations: { readOnlyHint: true },
  }, async ({ id }: { id: number }, extra: ToolExtra) => runTool("get_assignment", extra, async () => {
    const client = await createMagisterClient(getUserId(extra));
    return presentAssignmentDetail(await client.getAssignment(await client.getPersonId(), id));
  }));

  server.registerTool("list_study_guides", {
    title: "List study guides",
    description: "List active study guides for the connected student.",
    annotations: { readOnlyHint: true },
  }, async (extra: ToolExtra) => runTool("list_study_guides", extra, async () => {
    const client = await createMagisterClient(getUserId(extra));
    const items = await client.getStudyGuides(await client.getPersonId());
    return { count: items.length, items: items.map(presentStudyGuide) };
  }));

  server.registerTool("get_study_guide", {
    title: "Get study guide",
    description: "Return one study guide and its parts.",
    inputSchema: { id: z.number().int().positive() },
    annotations: { readOnlyHint: true },
  }, async ({ id }: { id: number }, extra: ToolExtra) => runTool("get_study_guide", extra, async () => {
    const client = await createMagisterClient(getUserId(extra));
    return presentStudyGuideDetail(await client.getStudyGuide(await client.getPersonId(), id));
  }));
}
