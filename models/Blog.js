const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    userName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [commentSchema],
  },
  {
    timestamps: true,
  }
);

// Virtual for likes count
blogSchema.virtual("likesCount").get(function () {
  return this.likes.length;
});

// Virtual for comments count
blogSchema.virtual("commentsCount").get(function () {
  return this.comments.length;
});

// Ensure virtuals are serialized
blogSchema.set("toJSON", { virtuals: true });
blogSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Blog", blogSchema);
