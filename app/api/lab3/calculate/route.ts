import defaultLab3InputJson from "@/data/lab3/input.json";
import variantLab3InputJson from "@/data/lab3/variant-8x11.json";
import { calculateLab3, LAB3_OBJECTS_COUNT, type Lab3Input } from "@/lib/lab3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function calculateFromInput(input: Lab3Input, expectedObjectsCount?: number) {
  return calculateLab3(input, {
    expectedObjectsCount,
    topLimit: 25,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");
    const input = mode === "variant811" ? (variantLab3InputJson as Lab3Input) : (defaultLab3InputJson as Lab3Input);
    const expectedObjectsCount = mode === "variant811" ? 11 : LAB3_OBJECTS_COUNT;
    const result = calculateFromInput(input, expectedObjectsCount);

    return Response.json({
      status: "ok",
      source: mode === "variant811" ? "variant-8x11" : "json",
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
