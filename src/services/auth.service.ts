import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
6;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export class AuthService {
  // register a new user
  static async register(data: {
    email: string;
    name: string;
    password: string;
    imageUrl: string | null;
  }) {
    const email = await data.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("AUTH_ERROR: Email is already registered.");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email,
        name: data.name,
        password: hashedPassword,
        image: data.imageUrl,
        role: "USER"
      },
    });

    // Include the user image inside the token payload
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
        role: newUser.role
      },
      token,
    };
  }

  // login user
  static async login(data: { email: string; password: string }) {
    const email = data.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("AUTH_ERROR: Invalid email or password.");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error("AUTH_ERROR: Invalid email or password.");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role
      },
      token,
    };
  }
}
