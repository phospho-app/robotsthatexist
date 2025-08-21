"use client";

import NextLink from "next/link";
import { ComponentProps } from "react";

interface LinkProps extends ComponentProps<typeof NextLink> {
  prefetch?: boolean;
}

/**
 * Custom Link component that disables prefetching by default.
 * 
 * This wrapper around Next.js Link sets prefetch=false by default to:
 * - Reduce unnecessary network requests
 * - Improve performance on slower connections
 * - Reduce server load from prefetch requests
 * 
 * You can still enable prefetching by explicitly setting prefetch={true}
 * 
 * @example
 * // Prefetching disabled (default)
 * <Link href="/robots">View Robots</Link>
 * 
 * // Prefetching enabled
 * <Link href="/important-page" prefetch={true}>Important Page</Link>
 */
export default function Link({ prefetch = false, ...props }: LinkProps) {
  return <NextLink prefetch={prefetch} {...props} />;
}