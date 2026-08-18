import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Team name is required"],
    trim: true,
    minlength: [1, "Team name cannot be empty"],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
});

const Team = mongoose.model("Team", teamSchema);

export default Team;
