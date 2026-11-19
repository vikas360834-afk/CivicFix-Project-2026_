import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  ward: u.ward,
  department: u.department,
  phone: u.phone,
  createdAt: u.createdAt,
});

export async function listUsers(req, res, next) {
  try {
    const where = {};
    if (req.query.role) {
      where.role = req.query.role.toUpperCase();
    }
    if (req.query.ward) {
      where.ward = req.query.ward;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ward: true,
        department: true,
        phone: true,
        createdAt: true,
        _count: { select: { issues: true, assignedIssues: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role, ward, department, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const assignedRole = role ? role.toUpperCase() : "USER";
    if (!["USER", "ENGINEER", "ADMIN"].includes(assignedRole)) {
      return res.status(400).json({ error: "Invalid role. Allowed roles: USER, ENGINEER, ADMIN" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hash,
        role: assignedRole,
        ward: ward || null,
        department: department || null,
        phone: phone || null,
      },
    });

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, phone, ward, department, role } = req.body;

    if (req.user.role !== "ADMIN" && req.user.id !== id) {
      return res.status(403).json({ error: "You cannot update another user's profile" });
    }

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (phone !== undefined) data.phone = phone ? phone.trim() : null;
    if (ward !== undefined) data.ward = ward || null;
    if (department !== undefined) data.department = department || null;

    if (role !== undefined) {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can change user roles" });
      }
      const validRoles = ["USER", "ENGINEER", "ADMIN"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role. Allowed roles: USER, ENGINEER, ADMIN" });
      }
      data.role = role;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ward: true,
        department: true,
        phone: true,
        createdAt: true,
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}