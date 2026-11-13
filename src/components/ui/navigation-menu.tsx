import * as React from "react";
import { cn } from "../../lib/utils";

export function navigationMenuTriggerStyle(options?: { active?: boolean; className?: string }) {
  return cn(
    "group inline-flex h-9 w-max items-center justify-center rounded-lg px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-medium transition-colors select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
    options?.active
      ? "bg-slate-100 text-slate-950 font-semibold shadow-2xs border border-slate-200/90"
      : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/70 border border-transparent",
    options?.className
  );
}

export const NavigationMenu = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
    {...props}
  >
    {children}
  </nav>
));
NavigationMenu.displayName = "NavigationMenu";

export const NavigationMenuList = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("group flex flex-1 list-none items-center justify-center gap-1 xl:gap-1.5", className)}
    {...props}
  />
));
NavigationMenuList.displayName = "NavigationMenuList";

export const NavigationMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("relative", className)} {...props} />
));
NavigationMenuItem.displayName = "NavigationMenuItem";

