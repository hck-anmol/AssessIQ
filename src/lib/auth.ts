import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder-google-client-id",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || "placeholder-google-client-secret",
    }),
    CredentialsProvider({
      id: "demo-login",
      name: "Demo Account",
      credentials: {
        email: { label: "Email", type: "email" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = String(credentials.email).toLowerCase();
        const role = (credentials.role === "EXAMINER" ? "EXAMINER" : "EXAMINEE") as Role;

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: role === "EXAMINER" ? "Prof. Smith (Examiner)" : "Alex Doe (Student)",
              role,
              college: "College of Engineering",
              department: "Computer Science",
              year: 2,
            },
          });
        }
        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // First sign-in: fetch role from DB
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { id: true, role: true },
        });
        token.id = dbUser?.id ?? user.id;
        token.role = dbUser?.role ?? "EXAMINEE";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    newUser: "/onboarding",
  },
  events: {
    async createUser({ user }) {
      // Auto-create user with EXAMINEE role on first sign-in
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "EXAMINEE" },
      });
    },
  },
});
