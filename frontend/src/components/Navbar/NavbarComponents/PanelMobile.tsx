import React, { forwardRef, Fragment, JSX } from "react";
import { DialogPanel, TransitionChild } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { NavConfig, NavItem } from "@/lib/navigation";
import { ThemeSwitcher } from "@/components/Navbar/ThemeSwitcher";
import AuthButton from "@/components/Navbar/NavbarComponents/AuthButton";
import Link from "next/link";
import { Session } from "next-auth";
import { ProfileDropdown } from "@/components/Navbar/NavbarComponents/ProfileDropdown";

interface PanelMobileProps {
    setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    renderMobileNavItem: (item: NavItem) => JSX.Element | undefined;
    navigationConfig: NavConfig;
    session: Session | null;
}

export const PanelMobile = forwardRef<HTMLDivElement, PanelMobileProps>(
    ({ setMobileMenuOpen, renderMobileNavItem, navigationConfig, session }, ref) => {
        // We can now use the full navItems list from the config
        const navigationConfigItems = navigationConfig.navItems;
        return (
            <TransitionChild
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
            >
                <DialogPanel ref={ref} className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white/85 p-6 sm:max-w-sm sm:border-l sm:border-black dark:bg-black/85 dark:sm:border-white backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="-m-1.5 p-1.5">
                            <p className="text-xl font-semibold">{navigationConfig.brandName}</p>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="-m-2.5 rounded-md p-2.5"
                        >
                            <span className="sr-only">Close menu</span>
                            <XMarkIcon aria-hidden="true" className="size-6" />
                        </button>
                    </div>
                    <div className="mt-6 flow-root">
                        <div className="-my-6 divide-y divide-neutral-200 dark:divide-neutral-800">
                            <div className="space-y-2 py-6">
                                {navigationConfigItems
                                    .filter(item => !item.admin || (session && session.user.role === "admin"))
                                    .map(renderMobileNavItem)}
                            </div>
                            <div className="py-6 space-y-4">
                                <AuthButton />
                                <div className="flex items-center justify-between">
                                    <span className="text-base/7 text-black dark:text-white">Switch Theme</span>
                                    <ThemeSwitcher />
                                </div>
                                <div className="flex items-center justify-between">
                                    {session && session.user.role !== "admin" && (
                                        <p>Hello, {session.user.name}</p>
                                    )}

                                    {session && session.user.role === "admin" && (
                                        <p>Hello, Admin {session.user.name}</p>
                                    )}

                                    <ProfileDropdown session={session} />
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogPanel>
            </TransitionChild>
        );
    })

PanelMobile.displayName = "PanelMobile";