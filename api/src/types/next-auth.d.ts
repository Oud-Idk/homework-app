import 'next-auth/jwt';

declare module 'next-auth/jwt' {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        /** The user's role. */
        role?: string;
    }
}