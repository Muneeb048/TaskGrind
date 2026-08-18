import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * PATCH /api/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.email !== undefined) updates.email = req.body.email.toLowerCase();

  // Check email uniqueness if changing email
  if (updates.email && updates.email !== user.email) {
    const existing = await User.findOne({ email: updates.email });
    if (existing) {
      throw ApiError.conflict("An account with that email already exists");
    }
  }

  const updated = await User.findByIdAndUpdate(
    user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.json(updated.toSafeJSON());
});
