"use client"

import { Cells } from "@/context/spreadsheet-context";

export const STORAGE_KEY = 'spreadsheet_data';
export const STORAGE_TITLE_KEY = 'spreadsheet_title';

// Check if we're on the client side
const isClient = typeof window !== 'undefined';

// Load spreadsheet data from localStorage
export function loadSpreadsheetData(): Cells {
  if (!isClient) {
    return {};
  }

  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : {};
  } catch (error) {
    console.error('Error loading spreadsheet data:', error);
    return {};
  }
}

// Load spreadsheet title from localStorage
export function loadSpreadsheetTitle(): string {
  if (!isClient) {
    return "Untitled Spreadsheet";
  }

  try {
    return localStorage.getItem(STORAGE_TITLE_KEY) || "Untitled Spreadsheet";
  } catch (error) {
    console.error('Error loading spreadsheet title:', error);
    return "Untitled Spreadsheet";
  }
}

// Save spreadsheet data to localStorage
export function saveSpreadsheetData(cells: Cells): void {
  if (!isClient) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cells));
  } catch (error) {
    console.error('Error saving spreadsheet data:', error);
    // Optionally show a user-friendly error message
    throw new Error('Failed to save spreadsheet. Storage might be full.');
  }
}

// Save spreadsheet title to localStorage
export function saveSpreadsheetTitle(title: string): void {
  if (!isClient) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_TITLE_KEY, title);
  } catch (error) {
    console.error('Error saving spreadsheet title:', error);
    // Optionally show a user-friendly error message
    throw new Error('Failed to save spreadsheet title.');
  }
}

// Clear all spreadsheet data from localStorage
export function clearSpreadsheetStorage(): void {
  if (!isClient) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TITLE_KEY);
  } catch (error) {
    console.error('Error clearing spreadsheet storage:', error);
  }
}

// Check if there is any saved spreadsheet data
export function hasSavedSpreadsheet(): boolean {
  if (!isClient) {
    return false;
  }

  return !!localStorage.getItem(STORAGE_KEY);
}

// Get the size of stored data (in bytes)
export function getStorageSize(): number {
  if (!isClient) {
    return 0;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY) || '';
    const title = localStorage.getItem(STORAGE_TITLE_KEY) || '';
    return data.length + title.length;
  } catch (error) {
    console.error('Error calculating storage size:', error);
    return 0;
  }
} 