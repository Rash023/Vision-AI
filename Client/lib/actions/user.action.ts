import db from "@/db/drizzle";
import { user } from "@/db/schema";
import { LoginUserProps, VerifyUserProps } from "@/types";
import { eq } from "drizzle-orm";
import { generateOTP, getCookieExpiration, getOTPExpiration } from "../utils";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { sendOTPEmail } from "./mail.action";

/* LOGIN USER */
export const loginUser = async (userData: LoginUserProps) => {
  try {
    const savedUser = await db
      .select()
      .from(user)
      .where(eq(user.email, userData.email));

    if (savedUser[0]) {
      const db_user = savedUser[0];
      const generatedOTP = generateOTP();
      const expirationTime = getOTPExpiration();
      await db
        .update(user)
        .set({ otp: generatedOTP, expiresIn: expirationTime });
      const req = {
        name: db_user.name as string,
        email: db_user.email,
        token: generatedOTP,
      };
      const response = await sendOTPEmail(req);
      if (response) {
        return JSON.stringify({ success: true });
      } else {
        return JSON.stringify({ success: false });
      }
    } else {
      return { success: false, message: "You are not registered with us." };
    }
  } catch (error) {
    console.error(error);
    return JSON.stringify({ success: false });
  }
};
/* VERIFY USER THROUGH OTP */
export const verifyUser = async ({ otp, email }: VerifyUserProps) => {
  try {
    const savedUser = await db.select().from(user).where(eq(user.email, email));
    if (savedUser[0]) {
      const db_user = savedUser[0];
      if (db_user.otp != Number(otp)) {
        const payload = {
          email: db_user.email,
          role: db_user.role,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY!, {
          expiresIn: process.env.JWT_EXPIRATION_TIME!,
        });
        cookies().set("token", token, {
          secure: true,
          expires: getCookieExpiration(),
        });
        return JSON.stringify({ success: true });
      } else {
        return JSON.stringify({ success: false });
      }
    }
  } catch (error) {
    console.error(error);
    return JSON.stringify({ success: false });
  }
};