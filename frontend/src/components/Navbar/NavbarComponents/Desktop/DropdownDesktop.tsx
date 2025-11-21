import { Popover, PopoverButton, PopoverPanel, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Dispatch, Fragment, SetStateAction } from "react";
import { NavDropdown } from "@/lib/navigation";
import Link from "next/link";
import {usePathname} from "next/navigation";

export const DropdownDesktop = (
    {
        item,
        openPopover,
        setOpenPopover
    }: {
        item: NavDropdown;
        openPopover: string | null;
        setOpenPopover: Dispatch<SetStateAction<string | null>>;
    }) => {
    const pathname = usePathname();
    return (
        <Popover key={item.name} className="relative">
            {({ open }) => (
                <div
                    onMouseEnter={() => setOpenPopover(item.name)}
                    onMouseLeave={() => setOpenPopover(null)}
                >
                    <PopoverButton className="flex items-center gap-x-1 text-md hover:bg-neutral-100 dark:hover:bg-neutral-900 px-4 py-2 rounded-md">
                        {item.name}
                        <ChevronDownIcon
                            aria-hidden="true"
                            className="size-5 flex-none"
                        />
                    </PopoverButton>

                    <Transition
                        as={Fragment}
                        show={openPopover === item.name || open}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <PopoverPanel
                            static
                            className="absolute border left-1/2 z-999 mt-6 w-screen max-w-md -translate-x-1/2 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-neutral-900/5 dark:bg-black dark:shadow-none dark:ring-white/10"
                        >
                            <div className="p-4 space-y-4">
                                {item.products.map((product) => (
                                    <div
                                        key={product.name}
                                        className={`group relative flex items-center gap-x-6 rounded-lg p-4 
                                        text-sm/6 hover:bg-neutral-100 dark:hover:bg-neutral-400/25
                                        ${pathname === product.href ? "bg-neutral-400/20 font-semibold" : ""}`}
                                    >
                                        <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-neutral-50 group-hover:bg-neutral-100 dark:bg-black border dark:group-hover:bg-neutral-900">
                                            <product.icon
                                                aria-hidden="true"
                                                className="size-6 text-black group-hover:text-neutral-800 dark:text-neutral-100 dark:group-hover:text-white"
                                            />
                                        </div>
                                        <div className="flex-auto">
                                            <Link href={product.href} className="block font-semibold text-neutral-900 dark:text-white">
                                                {product.name}
                                                <span className="absolute inset-0" />
                                            </Link>
                                            <p className="mt-1 text-neutral-600 dark:text-neutral-400">{product.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {item.callsToAction && (
                                <div className="grid grid-cols-2 divide-x border-t divide-black bg-white dark:divide-white dark:bg-black">
                                    {item.callsToAction.map((cta) => (
                                        <Link
                                            key={cta.name}
                                            href={cta.href}
                                            className={`flex items-center justify-center gap-x-2.5 p-3
                                            text-sm/6 font-semibold text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-900
                                            ${pathname === cta.href ? "bg-neutral-400/20 font-semibold" : ""}
                                            `}
                                        >
                                            <cta.icon aria-hidden="true" className="size-5 flex-none text-black dark:text-white" />
                                            {cta.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </PopoverPanel>
                    </Transition>
                </div>
            )}
        </Popover>
    )
}