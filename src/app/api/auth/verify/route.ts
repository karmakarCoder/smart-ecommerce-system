import { NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();
    const result = await AuthService.verifyOtp(email, otp);
    return NextResponse.json(
      { message: "Account verified successfully!", data: result },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
