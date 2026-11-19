import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;

export const CATEGORIES = [
  "ROAD",
  "STREET_LIGHT",
  "WATER",
  "SANITATION",
  "ELECTRICITY",
  "PARK",
  "GAS",
  "OTHER",
];

export const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const WARDS = [
  "Ward 1",
  "Ward 2",
  "Ward 3",
  "Ward 4",
  "Ward 5",
];