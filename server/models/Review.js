const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    line: { type: Number, required: true },
    endLine: { type: Number, required: true },
    severity: {
      type: String,
      enum: ['bug', 'security', 'performance', 'style', 'suggestion'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    suggestion: { type: String, required: true },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    code: { type: String, required: true },
    language: { type: String, required: true },
    comments: [commentSchema],
    summary: { type: String, default: '' },
    codeHash: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
