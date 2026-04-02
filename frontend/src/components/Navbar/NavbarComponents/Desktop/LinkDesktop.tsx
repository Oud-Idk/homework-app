"use client";

import { NavLink } from "@/lib/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const LinkDesktop = (
    {
        item,
    }: {
        item: NavLink,
    }
) => {
    const pathname = usePathname();
    return (
        <Link
            key={item.name}
            href={item.href}
            className={`
            text-md px-4 py-2 rounded-md mx-1
            hover:bg-neutral-400/20 hover:transition-colors dark:hover:bg-neutral-700/80
            ${pathname === item.href ? "bg-neutral-400/20 font-semibold" : ""}
            `}
        >
            {item.name}
        </Link>
    );
}