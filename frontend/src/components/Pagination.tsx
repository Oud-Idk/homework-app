'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import React, { useState, useEffect, FormEvent } from 'react';

interface PaginationProps {
    totalPages: number;
    currentPage: number;
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter(); // Kept for the page input form submission

    const [inputValue, setInputValue] = useState(currentPage.toString());

    // Sync input value with currentPage from URL
    useEffect(() => {
        setInputValue(currentPage.toString());
    }, [currentPage]);

    // This guard clause is important. If there's only one page, don't render anything.
    if (totalPages <= 1) {
        return null;
    }

    // Helper function to create the URL for a specific page number
    const createPageURL = (pageNumber: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    // Handler for submitting the page number input form
    const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        let pageNum = parseInt(inputValue, 10);
        if (!isNaN(pageNum)) {
            // Clamp the page number to be within valid bounds (1 to totalPages)
            pageNum = Math.max(1, Math.min(pageNum, totalPages));
            router.push(createPageURL(pageNum));
        }
    };

    const isFirstPage = currentPage <= 1;
    const isLastPage = currentPage >= totalPages;

    const prevPage = currentPage - 1;
    const nextPage = currentPage + 1;

    // Common classes for styling
    const commonButtonClasses = 'relative inline-flex items-center text-sm font-medium';
    const disabledClasses = 'pointer-events-none opacity-50';

    return (
        <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-4 py-3 sm:px-6 mt-4">
            {/* Mobile view */}
            <div className="flex flex-1 justify-between sm:hidden">
                <Link
                    href={createPageURL(prevPage)}
                    className={`${commonButtonClasses} rounded-md border border-neutral-300 bg-white px-4 py-2 text-neutral-700 hover:bg-neutral-50 ${isFirstPage ? disabledClasses : ''}`}
                    aria-disabled={isFirstPage}
                    tabIndex={isFirstPage ? -1 : undefined}
                >
                    Previous
                </Link>
                <Link
                    href={createPageURL(nextPage)}
                    className={`${commonButtonClasses} ml-3 rounded-md border border-neutral-300 bg-white px-4 py-2 text-neutral-700 hover:bg-neutral-50 ${isLastPage ? disabledClasses : ''}`}
                    aria-disabled={isLastPage}
                    tabIndex={isLastPage ? -1 : undefined}
                >
                    Next
                </Link>
            </div>

            {/* Desktop view */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <form onSubmit={handleFormSubmit} className="flex items-center gap-2 text-sm text-neutral-700">
                        <span>Page</span>
                        <input
                            type="number"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onBlur={() => setInputValue(currentPage.toString())} // Revert on blur if not submitted
                            min="1"
                            max={totalPages}
                            className="w-16 px-2 py-1 border border-neutral-300 rounded-md text-center font-medium"
                            aria-label={`Current page, page ${currentPage}`}
                        />
                        <span className="text-neutral-500">of {totalPages}</span>
                    </form>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <Link
                            href={createPageURL(prevPage)}
                            className={`${commonButtonClasses} rounded-l-md px-2 py-2 text-neutral-400 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 focus:z-20 focus:outline-offset-0 ${isFirstPage ? disabledClasses : ''}`}
                            aria-disabled={isFirstPage}
                            tabIndex={isFirstPage ? -1 : undefined}
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                        </Link>
                        <Link
                            href={createPageURL(nextPage)}
                            className={`${commonButtonClasses} rounded-r-md px-2 py-2 text-neutral-400 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 focus:z-20 focus:outline-offset-0 ${isLastPage ? disabledClasses : ''}`}
                            aria-disabled={isLastPage}
                            tabIndex={isLastPage ? -1 : undefined}
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                        </Link>
                    </nav>
                </div>
            </div>
        </div>
    );
}