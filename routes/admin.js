const express = require("express");
const Blog = require("../models/Blog");
const User = require("../models/User");
const { adminAuth } = require("../middleware/auth");
const router = express.Router();

// Get all blogs (admin view)
router.get("/blogs", adminAuth, async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate("author", "name email")
      .sort({ createdAt: -1 });

    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all users (with optional search)
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete any blog (admin only)
router.delete("/blogs/:id", adminAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    await Blog.findByIdAndDelete(blog._id);
    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update any blog (admin only)
router.put("/blogs/:id", adminAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
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

// Edit user info (name, email, role)
router.put("/users/:id", adminAuth, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (name) user.name = name;
    if (email) user.email = email;
    if (role && ["user", "admin"].includes(role)) user.role = role;
    await user.save();
    res.json({
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Reset user password
router.put("/users/:id/password", adminAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete user (admin only)
router.delete("/users/:id", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      console.error("Delete user error: User not found", req.params.id);
      return res.status(404).json({ message: "User not found" });
    }

    // Don't allow admin to delete themselves or other admins
    if (user.role === "admin") {
      console.error(
        "Delete user error: Attempt to delete admin user",
        req.params.id
      );
      return res.status(400).json({ message: "Cannot delete admin user" });
    }
    // Delete all blogs by this user
    await Blog.deleteMany({ author: user._id });
    // Delete the user
    await User.deleteOne({ _id: user._id });
    res.json({ message: "User and their blogs deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get dashboard stats
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalBlogs = await Blog.countDocuments();
    const totalComments = await Blog.aggregate([
      {
        $group: { _id: null, totalComments: { $sum: { $size: "$comments" } } },
      },
    ]);

    res.json({
      totalUsers,
      totalBlogs,
      totalComments: totalComments[0]?.totalComments || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get a user's blogs/learning materials
router.get("/users/:id/blogs", adminAuth, async (req, res) => {
  try {
    const blogs = await Blog.find({ author: req.params.id }).sort({
      createdAt: -1,
    });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
