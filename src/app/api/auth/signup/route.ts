import { NextRequest, NextResponse } from "next/server";
import { saveFileToDisk } from "@/lib/upload";
import { AuthService } from "../../../../services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;
    const imageFile = formData.get("image") as File | null;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, or password." },
        { status: 400 },
      );
    }

    const { origin } = new URL(request.url);
    const imageUrl = await saveFileToDisk(imageFile, origin);

    const result = await AuthService.register({
      email,
      name,
      password,
      imageUrl,
    });

    return NextResponse.json(
      { message: "User registered successfully", data: result },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
