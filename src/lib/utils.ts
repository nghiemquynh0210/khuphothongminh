import { clsx, type ClassValue } from "clsx";

/**
 * Standard shadcn/ui utility function to conditionally join classNames
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

