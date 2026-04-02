import { NavLink } from "@/lib/navigation";
import Link from "next/link";
import {usePathname} from "next/navigation";

export const LinkMobile = (
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
            className={
            `mx-3 block rounded-lg px-3 py-2 
            text-base/7 text-black dark:text-white hover:bg-neutral-400/25 hover:transition-colors
            ${pathname === item.href ? "bg-neutral-400/20 font-semibold" : ""}`
        }
        >
            {item.name}
        </Link>
    );
}