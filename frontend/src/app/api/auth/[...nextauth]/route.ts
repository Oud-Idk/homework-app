import NextAuth, { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { encode } from "next-auth/jwt";
import type { Adapter } from "next-auth/adapters";
import { ObjectId } from "mongodb";

// --- Environment Variables ---
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const authSecret = process.env.AUTH_SECRET;

if (!googleClientId || !googleClientSecret || !authSecret) {
    throw new Error("Missing required environment variables for NextAuth");
}

// --- Customized MongoDB Adapter ---
const adapter = MongoDBAdapter(clientPromise);

if (adapter.createUser) {
    const originalCreateUser = adapter.createUser;
    adapter.createUser = (user) => {
        const userWithRole = { ...user, role: 'member' };
        return originalCreateUser(userWithRole);
    };
}

// --- Define the NextAuth Configuration ---
export const authOptions: NextAuthOptions = {
    adapter: adapter as Adapter,
    session: { strategy: "jwt" },
    secret: authSecret,
    providers: [
        Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
        }),
    ],
    callbacks: {
        async signIn({ profile }) {
            if (profile?.hd !== "sekolahbim.sch.id") return '/unauthorized';
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                return token;
            }

            if (!token.id) {
                console.log("JWT callback: Token has no ID. Invalidating.");
                return { ...token, exp: 0 };
            }

            try {
                const client = await clientPromise;
                const db = client.db();

                const dbUser = await db.collection("users").findOne({ _id: new ObjectId(token.id as string) });

                if (!dbUser) {
                    return { ...token, exp: 0 }; // Invalidate the token
                }

                token.role = dbUser.role; // Refresh the role in case it changed

            } catch (error) {
                console.error("JWT Error during re-validation:", error);
                return { ...token, exp: 0 }; // Invalidate on error
            }

            return token;
        },
        async session({ session, token }) {
            if (token && token.id && token.exp !== 0) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.accessToken = await encode({ token, secret: authSecret });
                return session; // Return the valid, populated session
            }

            return session;
        }
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };