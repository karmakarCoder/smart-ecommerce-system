import { NextRequest, NextResponse } from "next/server";
import { AiService } from "@/services/ai.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing string body parameter: prompt" },
        { status: 400 },
      );
    }

    const userRole = request.headers.get("x-user-role") || "USER";

    const result = await AiService.executeSmartAction(prompt, userRole);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.message.startsWith("FORBIDDEN")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
