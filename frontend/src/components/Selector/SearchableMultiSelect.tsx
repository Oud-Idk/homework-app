import { useState, useMemo } from 'react';
import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
    Label,
    Portal
} from '@headlessui/react';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { useFloating, autoUpdate, flip, size, offset } from '@floating-ui/react';

interface MultiSelectProps<T> {
    items: T[];
    selected: T[];
    onChange: (selected: T[]) => void;
    getLabel: (item: T) => string;
    getValue: (item: T) => string | number;
    label?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const SearchableMultiSelect = <T,>({
    items,
    selected,
    onChange,
    getLabel,
    getValue,
    label,
    placeholder = "Select options...",
    className = "w-full",
    disabled = false,
}: MultiSelectProps<T>) => {
    const [query, setQuery] = useState('');

    // --- OUR CUSTOM ANCHOR LOGIC ---
    const { refs, floatingStyles } = useFloating({
        placement: 'bottom-start',
        strategy: 'fixed', // Keeps it floating above the DOM without shifting layout
        whileElementsMounted: autoUpdate, // Auto recalculates on scroll/resize
        middleware: [
            offset(4), // 4px gap between input and dropdown
            flip({ padding: 8 }), // Flips UP if there's no space DOWN
            size({
                apply({ rects, elements }) {
                    // Force the dropdown to exactly match the container's width
                    Object.assign(elements.floating.style, {
                        width: `${rects.reference.width}px`,
                    });
                }
            })
        ]
    });

    const availableItems = useMemo(() => {
        return items.filter(
            (item) => !selected.find((s) => getValue(s) === getValue(item))
        );
    }, [items, selected, getValue]);

    const filteredItems = useMemo(() => {
        return query === ''
            ? availableItems
            : availableItems.filter((item) =>
                getLabel(item).toLowerCase().includes(query.toLowerCase())
            );
    }, [availableItems, query, getLabel]);

    const handleUnselect = (itemToRemove: T) => {
        onChange(selected.filter((p) => getValue(p) !== getValue(itemToRemove)));
    };

    return (
        <div className={className}>
            <Combobox
                value={selected}
                onChange={onChange}
                multiple
                disabled={disabled}
                onClose={() => setQuery('')}
            >
                {label && (
                    <Label className="block text-sm font-medium mb-1 text-neutral-900 dark:text-neutral-200">
                        {label}
                    </Label>
                )}

                {/* 1. setReference points at our OUTER container, not the input! */}
                <div ref={refs.setReference} className="relative">
                    <div className="flex flex-wrap items-center border rounded-md bg-white dark:bg-black min-h-10 pr-8">
                        {selected.map((item) => (
                            <span
                                key={getValue(item)}
                                className="flex max-w-[calc(100%-8px)] ml-1 my-1 items-center gap-1 rounded px-2 py-0.5 text-sm font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-200"
                            >
                                <span className="truncate min-w-0">
                                    {getLabel(item)}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnselect(item);
                                    }}
                                    className="shrink-0 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                    <XMarkIcon className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        ))}

                        <ComboboxInput
                            className="flex-1 min-w-[60px] bg-transparent outline-none border-none py-1 pl-2 text-sm dark:text-white"
                            placeholder={selected.length === 0 ? placeholder : ""}
                            displayValue={() => ""}
                            onChange={(event) => setQuery(event.target.value)}
                        />

                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronsUpDownIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                        </ComboboxButton>
                    </div>
                </div>

                {/*
                  2. We use Headless UI's Portal so it completely escapes your DOM layout.
                  3. We attach setFloating and floatingStyles to physically position it.
                  4. NO `anchor` prop used here!
                */}
                <Portal>
                    <ComboboxOptions
                        ref={refs.setFloating}
                        style={floatingStyles}
                        transition
                        className="z-50 rounded-md border bg-white text-base shadow-lg sm:text-sm dark:bg-black max-h-60 overflow-auto empty:invisible transition duration-100 ease-in data-[closed]:opacity-0"
                    >
                        {filteredItems.length === 0 && query !== '' ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-neutral-500">
                                Nothing found.
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <ComboboxOption
                                    key={getValue(item)}
                                    value={item}
                                    className={({ focus }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 outline-none ${
                                            focus ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-900 dark:text-neutral-200'
                                        }`
                                    }
                                >
                                    {({ selected: isSelected }) => (
                                        <>
                                            <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                                                {getLabel(item)}
                                            </span>
                                            {isSelected && (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                            )}
                                        </>
                                    )}
                                </ComboboxOption>
                            ))
                        )}
                    </ComboboxOptions>
                </Portal>
            </Combobox>
        </div>
    );
};