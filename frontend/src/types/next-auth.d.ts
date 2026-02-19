import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Profile {
        hd: string;
    }

    /**
     * The shape of the user object returned in the session.
     */
    interface Session {
        user: {
            id: string;
            role: string;
            classroomId?: string | null;
        } & DefaultSession["user"];
        accessToken: string;
    }

    /**
     * The shape of the user object in the database.
     */
    interface User extends DefaultUser {
        role: string;
        classroomId?: string | null;
    }
}

declare module "next-auth/jwt" {
    /**
     * The shape of the JWT token.
     */
    interface JWT extends DefaultJWT {
        id: string;
        role: string;
        classroomId?: string | null;
    }
}