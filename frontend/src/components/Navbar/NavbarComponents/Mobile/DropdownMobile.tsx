import { Disclosure, DisclosureButton, DisclosurePanel, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { CallToActionLink, NavDropdown } from "@/lib/navigation";
import { usePathname } from "next/navigation";
import Link from "next/link";

export const DropdownMobile = ({
    item,
    allItems,
}: {
    item: NavDropdown;
    allItems: CallToActionLink[];
}) => {
    const pathname = usePathname();
    return (
        <Disclosure key={item.name} as="div" className="mx-3">
            {/* Use a render prop to access the 'open' state */}
            {({ open }) => (
                <>
                    <DisclosureButton className="group flex w-full items-center justify-between rounded-lg py-2 pr-3.5 pl-3 hover:bg-neutral-400/25 hover:transition-colors">
                        {item.name}
                        {/* You can use the 'open' state here too if you need */}
                        <ChevronDownIcon aria-hidden="true" className={`size-5 flex-none transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </DisclosureButton>
                    
                    {/* Wrap the panel with the Transition component */}
                    <Transition
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 -translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 -translate-y-1"
                    >
                        <DisclosurePanel className="mt-2 space-y-2">
                            {allItems.map((subItem) => (
                                <DisclosureButton
                                    key={subItem.name}
                                    as={Link}
                                    href={subItem.href}
                                    className={`block rounded-lg py-2 pr-3 pl-6 text-base hover:bg-neutral-400/25 hover:transition-colors
                                    ${pathname === subItem.href ? "bg-neutral-400/20 font-semibold" : ""}`}
                                >
                                    {subItem.name}
                                </DisclosureButton>
                            ))}
                        </DisclosurePanel>
                    </Transition>
                </>
            )}
        </Disclosure>
    )
}