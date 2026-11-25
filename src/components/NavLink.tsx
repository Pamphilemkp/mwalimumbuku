"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

interface NavLinkCompatProps extends Omit<ComponentProps<typeof NextLink>, "className" | "href"> {
  to: string;
  className?: string;
  activeClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, to, ...props }, ref) => {
    const pathname = usePathname();
    const active = pathname === to || pathname.startsWith(`${to}/`);
    return <NextLink ref={ref} href={to} className={cn(className, active && activeClassName)} {...props} />;
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
