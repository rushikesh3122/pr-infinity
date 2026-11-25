import { Schema, model } from 'mongoose';

/** Atomic sequence store, used to issue unique invoice numbers. */
const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

export const CounterModel = model('Counter', counterSchema);
