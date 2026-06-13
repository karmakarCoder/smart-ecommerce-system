import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "../../../../services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: email and password." },
        { status: 400 },
      );
    }

    const result = await AuthService.login({ email, password });
    return NextResponse.json(
      { message: "Login successful", data: result },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
