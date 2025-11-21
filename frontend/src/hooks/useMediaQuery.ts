"use client";

import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);

        // This function updates the state when the media query match status changes
        const listener = () => {
            setMatches(media.matches);
        };

        // Call the listener once to set the initial state
        listener();

        // Add the event listener
        media.addEventListener('change', listener);

        // Cleanup function to remove the listener when the component unmounts
        return () => media.removeEventListener('change', listener);
    }, [query]); // Re-run the effect if the query string changes

    return matches;
};