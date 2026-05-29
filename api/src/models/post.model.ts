import { Schema, model, Document, Types, Query, InferSchemaType } from 'mongoose';
import { meiliClient } from '../services/meilisearch.service.js';

const PostSchema = new Schema({
    title: { type: String, required: false },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    homework: { type: Schema.Types.ObjectId, ref: 'Homework', required: false },
    parent: { type: Schema.Types.ObjectId, ref: 'Post', default: null, index: true },
    depth: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
}, {
    timestamps: true,
});

PostSchema.index({ title: 'text', content: 'text' });

export type IPost = InferSchemaType<typeof PostSchema>;
export interface IPostDocument extends IPost, Document {
    _id: Types.ObjectId;
}

const syncToMeili = async function(doc: IPostDocument) {
    try {
        const index = meiliClient.index('posts');
        if (doc.parent === null && !doc.isDeleted) {
            // Convert Mongoose doc to a plain object for Meilisearch
            const postObject = doc.toObject({ versionKey: false });
            // Ensure IDs are strings
            postObject._id = postObject._id.toString();
            if (postObject.author) postObject.author = postObject.author.toString();
            if (postObject.homework) postObject.homework = postObject.homework.toString();

            await index.addDocuments([postObject], { primaryKey: '_id' });
        } else if (doc.isDeleted || doc.parent !== null) {
            // If a post becomes a reply or is soft-deleted, remove it from the index
            await index.deleteDocument(doc._id.toString());
        }
    } catch (error) {
        console.error(`Meilisearch sync error on save for doc ${doc._id}:`, error);
    }
}

// After a post is saved (created or updated), add/update it in Meilisearch
PostSchema.post('save', syncToMeili);

// We must also handle updates specifically
PostSchema.post('findOneAndUpdate', async function (doc: IPostDocument | null) {
    if (doc) {
        await syncToMeili(doc);
    }
});


// When a post is hard-deleted, remove it from the index
PostSchema.post('findOneAndDelete', async function (doc: IPostDocument | null) {
    try {
        if (doc) {
            const index = meiliClient.index('posts');
            await index.deleteDocument(doc._id.toString());
        }
    } catch (error) {
        console.error(`Meilisearch sync error on delete for doc ${doc?._id}:`, error);
    }
});

PostSchema.post('deleteMany', async function (this: Query<unknown, IPost>) {
    try {
        type PostIdOnly = { _id: Types.ObjectId };

        const deletedPosts = await this.model.find(this.getFilter(), { _id: 1 }).lean<PostIdOnly[]>();
        const deletedIds = deletedPosts.map(d => d._id.toString());

        if (deletedIds.length > 0) {
            const index = meiliClient.index('posts');
            await index.deleteDocuments(deletedIds);
            console.log(`[Meilisearch] Deleted ${deletedIds.length} documents.`);
        }
    } catch (error) {
        console.error('Meilisearch sync error on deleteMany:', error);
    }
});


export default model<IPost>('Post', PostSchema);