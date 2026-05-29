import { Schema, model, Document, InferSchemaType, Types } from 'mongoose';

const GroupSchema = new Schema({
  name: { type: String, required: true },
  path: { type: String, required: true, unique: true, index: true },
  parent: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
});

export type IGroup = InferSchemaType<typeof GroupSchema> & {
    _id: Types.ObjectId;
};
export interface IGroupDocument extends IGroup, Document {
    _id: Types.ObjectId;
}

export default model<IGroupDocument>('Group', GroupSchema);