'use client';

import { useState, useTransition, FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const useUserSearch = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
    const [isPending, startTransition] = useTransition();

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const params = new URLSearchParams(searchParams);
        params.set('page', '1');

        if (searchQuery) {
            params.set('query', searchQuery);
        } else {
            params.delete('query');
        }

        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`);
        });
    };

    return {
        searchQuery,
        setSearchQuery,
        handleSearch,
        isPending,
    };
};