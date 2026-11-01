import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// Designated teacher emails. Only these emails get the EXAMINER role.
export const TEACHER_EMAILS = [
  "anmolkrjha006@gmail.com",
  "gauriborse1808@gmail.com",
].map((e) => e.toLowerCase().trim());

export function isTeacherEmail(email: string): boolean {
  return TEACHER_EMAILS.includes(email.toLowerCase().trim());
}

export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  college?: string | null;
  department?: string | null;
  year?: number | null;
  image?: string | null;
}

export interface Session {
  user: SessionUser;
}

/**
 * Resolves the authenticated session via Clerk and syncs with the Prisma User record.
 */
export async function auth(): Promise<Session | null> {
  try {
    const { userId: clerkId } = await clerkAuth();
    if (!clerkId) {
      return null;
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }

    const email = (
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress
    )?.toLowerCase().trim();

    if (!email) {
      return null;
    }

    // Determine role strictly based on whitelist
    const expectedRole: Role = isTeacherEmail(email) ? "EXAMINER" : "EXAMINEE";

    // Lookup user in Prisma DB by Clerk ID or by email
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: clerkId }, { email }],
      },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: clerkId,
          email,
          name:
            `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
            clerkUser.username ||
            email,
          image: clerkUser.imageUrl,
          role: expectedRole,
        },
      });
    } else if (dbUser.role !== expectedRole) {
      // Keep database role in strict sync with assigned whitelist
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: expectedRole },
      });
    }

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        college: dbUser.college,
        department: dbUser.department,
        year: dbUser.year,
        image: dbUser.image,
      },
    };
  } catch (err) {
    console.error("Clerk auth resolution error:", err);
    return null;
  }
}
