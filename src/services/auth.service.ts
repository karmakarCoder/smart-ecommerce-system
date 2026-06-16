import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { getOtpEmailTemplate } from "../templates/emails/otp-template";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiryMinutes = 15;
    const otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const newUser = await prisma.user.create({
      data: {
        email,
        name: data.name,
        password: hashedPassword,
        image: data.imageUrl,
        role: "USER",
        otp,
        otpExpiresAt,
        isVerified: false,
      },
    });

    const emailHtml = getOtpEmailTemplate({
      name: newUser.name || "User",
      otp,
      expiryMinutes,
    });

    // Transmit email safely
    await transporter.sendMail({
      from: `Ecommerce <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Secure Verification Code: ${otp}`,
      html: emailHtml,
    });

    return {
      email: newUser.email,
      message: "OTP sent to your email successfully!",
    };
  }

  // verify OTP

  static async verifyOtp(email: string, otp: string) {
    if (!email || !otp) {
      throw new Error("VALIDATION_ERROR: Email and OTP are required.");
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error("NOT_FOUND: User not found.");
    }

    if (user.isVerified) {
      throw new Error("BAD_REQUEST: User is already verified.");
    }

    // Check if OTP matches and hasn't expired
    if (
      user.otp !== otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      throw new Error("VALIDATION_ERROR: Invalid or expired OTP.");
    }

    // Mark user as active, wipe OTP fields
    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    // Include the user image inside the token payload
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
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
        role: user.role,
        is_verified: true,
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

    if (user && !user.isVerified) {
      throw new Error("Please verify your email before logging in.");
    }

    if (!user) {
      throw new Error("Please enter a valid email and password.");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error("Please enter a valid email and password.");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
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
        role: user.role,
        is_verified: user.isVerified,
      },
      token,
    };
  }
}
