"use client";

import React, { useRef, useCallback } from 'react';

export const useMarkdownScroller = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleLinkClick = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const target = event.target as HTMLElement;
        const link = target.closest('a');

        if (link && link.hash && link.pathname === window.location.pathname) {
            event.preventDefault();
            event.stopPropagation();

            const id = decodeURIComponent(link.hash.substring(1));
            const element = containerRef.current?.querySelector(`#${id}`);
            const container = containerRef.current;

            if (element && container) {
                const targetTop = element.getBoundingClientRect().top;
                const containerTop = container.getBoundingClientRect().top;
                const scrollPosition = targetTop - containerTop + container.scrollTop;

                container.scrollTo({
                    top: scrollPosition,
                    behavior: 'smooth'
                });
            }
        }
    }, []);

    return { containerRef, handleLinkClick };
};