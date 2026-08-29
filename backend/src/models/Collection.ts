import { Schema, model, Types } from "mongoose";

export interface ICollection {
  _id: Types.ObjectId;
  name: string;
  parentId: Types.ObjectId | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    parentId: { type: Schema.Types.ObjectId, ref: "Collection", default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

collectionSchema.index({ parentId: 1, order: 1 });
collectionSchema.index({ name: "text" });

export const Collection = model<ICollection>("Collection", collectionSchema);
