import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [1, "Project name cannot be empty"],
    },
    description: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "#5b5bd6",
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: "updatedAt" },
  }
);

// Index for listing projects by owner, sorted by most recently updated
projectSchema.index({ owner: 1, updatedAt: -1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;
