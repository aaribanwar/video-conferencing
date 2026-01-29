import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "crypto";

import { User } from "../models/user.model.js";
import wrapAsync from "../utils/wrapAsync.js";

/**
 * REGISTER
 */
export const register = wrapAsync(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    const err = new Error("username, email and password are required");
    err.status = httpStatus.BAD_REQUEST;
    throw err;
  }

  const existingUser = await User.findOne({ username });

  if (existingUser) {
    const err = new Error("User already exists");
    err.status = httpStatus.CONFLICT;
    throw err;
  }

  // bcrypt is async (see explanation below)
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    username,
    email,
    password: hashedPassword,
  });

  await newUser.save();

  res.status(httpStatus.CREATED).json({
    message: "User registered successfully",
  });
});

/**
 * LOGIN
 */
export const login = wrapAsync(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    const err = new Error("username and password are required");
    err.status = httpStatus.BAD_REQUEST;
    throw err;
  }

  const existingUser = await User.findOne({ username });

  if (!existingUser) {
    const err = new Error("User does not exist");
    err.status = httpStatus.NOT_FOUND;
    throw err;
  }

  // ❗ bcrypt.compare IS async — this must be awaited
  const isPasswordValid = await bcrypt.compare(
    password,
    existingUser.password
  );

  if (!isPasswordValid) {
    const err = new Error("Incorrect password");
    err.status = httpStatus.UNAUTHORIZED;
    throw err;
  }

  // Simple token for now (acceptable in v1)
  const token = crypto.randomBytes(20).toString("hex");

  existingUser.token = token;
  await existingUser.save();

  res.status(httpStatus.OK).json({
    message: "User successfully logged in",
    token,
  });
});
