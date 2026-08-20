import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Role } from "../models/Role.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role?.name,
    permissions: user.role?.permissions || []
  };
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError("Email and password are required.");
  const user = await User.findOne({ email: String(email).toLowerCase() })
    .select("+passwordHash")
    .populate("role");
  if (!user || !user.active || !(await user.verifyPassword(password))) {
    throw new AppError("Invalid email or password.", 401);
  }
  const token = jwt.sign({ sub: user._id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.json({ token, user: publicUser(user) });
});

export const me = asyncHandler(async (req, res) => res.json({ user: publicUser(req.user) }));

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role: roleId } = req.body;
  if (!name || !email || !password || !roleId) throw new AppError("Name, email, password and role are required.");
  const role = await Role.findById(roleId);
  if (!role) throw new AppError("Selected role was not found.", 404);
  const user = await User.create({
    name,
    email: String(email).toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    role: role._id
  });
  res.status(201).json({ user: await user.populate("role") });
});

