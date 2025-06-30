const express = require("express");
const multer = require("multer");
const path = require("path");
const Blog = require("../models/Blog");
const { auth } = require("../middleware/auth");
const router = express.Router();
const { blogImageStorage } = require("../utils/cloudinary");

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: blogImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Get all blogs
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate("author", "name")
      .sort({ createdAt: -1 });

    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single blog
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate("author", "name")
      .populate("comments.user", "name");

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create new blog
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    // Use uploaded image or default image
    const imageUrl = req.file
      ? req.file.path // Cloudinary URL
      : "https://via.placeholder.com/600x400?text=Blog+Image";

    const blog = new Blog({
      title,
      description,
      image: imageUrl,
      author: req.user._id,
      authorName: req.user.name,
    });

    await blog.save();

    const populatedBlog = await blog.populate("author", "name");
    res.status(201).json(populatedBlog);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update blog
router.put("/:id", auth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Check if user is author or admin
    if (
      blog.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    blog.title = title || blog.title;
    blog.description = description || blog.description;

    await blog.save();

    const updatedBlog = await blog.populate("author", "name");
    res.json(updatedBlog);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete blog
router.delete("/:id", auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Check if user is author or admin
    if (
      blog.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Delete the blog using deleteOne
    await Blog.deleteOne({ _id: blog._id });
    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Like/Unlike blog
router.post("/:id/like", auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const likeIndex = blog.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      // Unlike
      blog.likes.splice(likeIndex, 1);
    } else {
      // Like
      blog.likes.push(req.user._id);
    }

    await blog.save();
    res.json({ likes: blog.likes, likesCount: blog.likesCount });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Add comment
router.post("/:id/comment", auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    blog.comments.push({
      user: req.user._id,
      content,
      userName: req.user.name,
    });

    await blog.save();

    const updatedBlog = await blog.populate("comments.user", "name");
    res.json(updatedBlog.comments);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete comment
router.delete("/:blogId/comment/:commentId", auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.blogId);

    if (!blog) {
      console.error("Delete comment error: Blog not found", req.params.blogId);
      return res.status(404).json({ message: "Blog not found" });
    }

    const comment = blog.comments.id(req.params.commentId);

    if (!comment) {
      console.error(
        "Delete comment error: Comment not found",
        req.params.commentId
      );
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user is comment author or admin
    if (
      comment.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      console.error(
        "Delete comment error: Not authorized",
        req.user._id,
        comment.user
      );
      return res.status(403).json({ message: "Not authorized" });
    }

    // Remove the comment using pull
    blog.comments.pull(comment._id);
    await blog.save();

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
