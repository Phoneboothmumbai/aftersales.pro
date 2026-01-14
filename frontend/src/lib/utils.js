import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getStatusColor(status) {
  const colors = {
    received: "status-received",
    diagnosed: "status-diagnosed",
    waiting_for_approval: "status-waiting_for_approval",
    repaired: "status-repaired",
    closed: "status-closed",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

export function getStatusLabel(status) {
  const labels = {
    received: "Received",
    diagnosed: "Diagnosed",
    waiting_for_approval: "Waiting for Approval",
    repaired: "Repaired",
    closed: "Closed",
  };
  return labels[status] || status;
}

export function getDeviceTypeIcon(type) {
  const icons = {
    laptop: "Laptop",
    mobile: "Smartphone",
    tablet: "Tablet",
    other: "HardDrive",
  };
  return icons[type?.toLowerCase()] || "HardDrive";
}

export const DEVICE_TYPES = ["Laptop", "Mobile", "Tablet", "Other"];

export const DEVICE_CONDITIONS = [
  "Fresh",
  "Active",
  "Physical Damage",
  "Dead",
  "Liquid Damage",
];

export const DEFAULT_ACCESSORIES = [
  { name: "Charger", checked: false },
  { name: "Adapter", checked: false },
  { name: "Bag", checked: false },
  { name: "SIM Tray", checked: false },
  { name: "Stylus", checked: false },
  { name: "Case/Cover", checked: false },
  { name: "Screen Guard", checked: false },
];

export const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Pending",
];
