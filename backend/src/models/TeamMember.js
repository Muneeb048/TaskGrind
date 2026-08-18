import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    default: "Pending invite",
  },
  avatar: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    enum: ["owner", "admin", "member"],
    default: "member",
  },
  status: {
    type: String,
    enum: ["active", "invited"],
    default: "invited",
  },
});

// Same team + email must be unique (prevent duplicate invites)
teamMemberSchema.index({ team: 1, email: 1 }, { unique: true });

const TeamMember = mongoose.model("TeamMember", teamMemberSchema);

export default TeamMember;
