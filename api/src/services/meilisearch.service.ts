import { MeiliSearch } from 'meilisearch';
import 'dotenv/config'; // Make sure to install dotenv: npm install dotenv

const meiliHost = process.env.MEILISEARCH_HOST;
const meiliApiKey = process.env.MEILISEARCH_API_KEY;

if (!meiliHost || !meiliApiKey) {
    throw new Error("Meilisearch host or API key is not defined in environment variables.");
}

export const meiliClient = new MeiliSearch({
    host: meiliHost,
    apiKey: meiliApiKey,
});

/**
 * Initializes the posts index with default settings.
 * This should be run once when your application starts.
 */
export const initializeMeili = async () => {
    try {
        await meiliClient.createIndex('posts', { primaryKey: '_id' });
        console.log("Meilisearch: 'posts' index created or already exists.");

        const index = meiliClient.index('posts');

        // Configure what fields are searchable
        await index.updateSearchableAttributes([
            'title',
            'content'
        ]);

        // Configure what fields can be used for filtering and sorting
        await index.updateFilterableAttributes([
            'author',
            'homework',
            'parent'
        ]);

        await index.updateSortableAttributes([
            'createdAt'
        ]);

        console.log("Meilisearch: 'posts' index configured successfully.");

    } catch (error) {
        console.error("Error initializing Meilisearch:", error);
    }
};

// You would call initializeMeili() in your main application entry point (e.g., index.js or app.js)