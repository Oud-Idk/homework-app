'use client'

import { Fragment, useState } from 'react'
import {
    Dialog,
    PopoverGroup,
    Transition,
    TransitionChild,
} from '@headlessui/react'
import { ThemeSwitcher } from "@/components/Navbar/ThemeSwitcher";

import { AuthButtonDesktop } from "@/components/Navbar/NavbarComponents/AuthButton";
import { ProfileDropdown } from "@/components/Navbar/NavbarComponents/ProfileDropdown";

import { navigationConfig, NavItem } from '@/lib/navigation';
import { useSession } from "next-auth/react";
import {usePathname} from "next/navigation";

import { DropdownDesktop } from "@/components/Navbar/NavbarComponents/Desktop/DropdownDesktop";
import { DropdownMobile } from "@/components/Navbar/NavbarComponents/Mobile/DropdownMobile";
import { LinkDesktop } from "@/components/Navbar/NavbarComponents/Desktop/LinkDesktop";
import { LinkMobile } from "@/components/Navbar/NavbarComponents/Mobile/LinkMobile";
import { MenuButtonMobile } from "@/components/Navbar/NavbarComponents/Mobile/MenuButtonMobile";
import { PanelMobile } from "@/components/Navbar/NavbarComponents/PanelMobile";

import Link from "next/link";

export default function Navbar() {
    const { data: session } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const pathname = usePathname();

    const renderDesktopNavItem = (item: NavItem) => {
        if (item.type === 'link') {
            return <LinkDesktop key={item.name} item={item} />
        }

        if (item.type === 'dropdown') {
            return <DropdownDesktop item={item} key={item.name} openPopover={openPopover} setOpenPopover={setOpenPopover} />
        }
    };

    const renderMobileNavItem = (item: NavItem) => {
        if (item.type === 'link') {
            return <LinkMobile key={item.name} item={item} />
        }

        if (item.type === 'dropdown') {
            const allItems = [...(item.products ?? []), ...(item.callsToAction ?? [])];
            return <DropdownMobile key={item.name} item={item} allItems={allItems} />
        }
    };

    return (
        <header className="border-b left-0 top-0 w-full z-50">
            <nav aria-label="Global" className="mx-auto flex max-w-7xl text-sm items-center justify-between p-4 lg:p-5 lg:py-2.5">
                <div className="flex lg:flex-1">
                    <Link href="/" className="flex flex-row items-center gap-4">
                        <h1>{navigationConfig.brandName} {pathname === "/love" && <span className="animate-pulse text-pink-500">💘</span>}</h1>
                    </Link>
                </div>

                <MenuButtonMobile setMobileMenuOpen={setMobileMenuOpen} />

                <PopoverGroup className="hidden lg:flex">
                    {navigationConfig.navItems
                        .filter(item => !item.admin || (session && session.user.role === "admin"))
                        .map(renderDesktopNavItem)}
                </PopoverGroup>

                <div className="hidden lg:flex lg:flex-1 lg:justify-end items-center gap-x-4">
                    <ThemeSwitcher />

                    {session ? (
                        <ProfileDropdown session={session} />
                    ) : (
                        <AuthButtonDesktop />
                    )}
                </div>
            </nav>

            <Transition show={mobileMenuOpen} as={Fragment}>
                <Dialog onClose={setMobileMenuOpen} className="lg:hidden">
                    <TransitionChild
                        as={Fragment}
                        enter="transition-opacity ease-linear duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity ease-linear duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px]" />
                    </TransitionChild>

                    <PanelMobile
                        setMobileMenuOpen={setMobileMenuOpen}
                        renderMobileNavItem={renderMobileNavItem}
                        navigationConfig={navigationConfig}
                        session={session}
                    />
                </Dialog>
            </Transition>
        </header>
    )
}