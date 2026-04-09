import lab3InputJson from "@/data/lab3/input.json";
import { calculateLab3, LAB3_OBJECTS_COUNT, type Lab3Input } from "@/lib/lab3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function calculateFromInput(input: Lab3Input) {
  return calculateLab3(input, {
    expectedObjectsCount: LAB3_OBJECTS_COUNT,
    topLimit: 25,
  });
}

export async function GET() {
  try {
    const result = calculateFromInput(lab3InputJson as Lab3Input);

    return Response.json({
      status: "ok",
      source: "json",
      ...result,
    });
  } catch (error: unknown) {
    return Response.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as Lab3Input;
    const result = calculateFromInput(input);

    return Response.json({
      status: "ok",
      ...result,
    });
  } catch (error: unknown) {
    return Response.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}
