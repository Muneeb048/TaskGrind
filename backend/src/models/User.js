import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },
    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

// Strip passwordHash from JSON output
userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);

export default User;
