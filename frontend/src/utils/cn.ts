/**
 * Utility to merge Tailwind class names conditionally.
 * Lightweight alternative to clsx + tailwind-merge for this project.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
