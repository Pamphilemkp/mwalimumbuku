"use client";

import NextLink from "next/link";
import { usePathname, useRouter, useParams as useNextParams, useSearchParams as useNextSearchParams } from "next/navigation";
import { useEffect, type ComponentProps, type ReactNode } from "react";

type LinkProps = Omit<ComponentProps<"a">, "href"> & {
  to?: string;
  href?: string;
  children?: ReactNode;
  replace?: boolean;
};

export function Link({ to, href, replace, ...props }: LinkProps) {
  const destination = to ?? href ?? "/";
  return <NextLink href={destination} replace={replace} {...props} />;
}

export function useNavigate() {
  const router = useRouter();
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      router.back();
      return;
    }
    if (options?.replace) router.replace(to);
    else router.push(to);
  };
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [replace, router, to]);
  return null;
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  return useNextParams() as T;
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const search = searchParams.toString();
  return { pathname, search: search ? `?${search}` : "", hash: "", state: null };
}

export function useSearchParams() {
  const params = useNextSearchParams();
  return [params] as const;
}
