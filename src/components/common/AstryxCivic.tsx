import React from "react";
import { Button as CoreButton } from "@astryxdesign/core/Button";
import { Badge as CoreBadge } from "@astryxdesign/core/Badge";
import { Card as CoreCard } from "@astryxdesign/core/Card";
import { StatusDot as CoreStatusDot } from "@astryxdesign/core/StatusDot";

export { CoreButton, CoreBadge, CoreCard, CoreStatusDot };

export interface CivicBadgeProps {
  label: React.ReactNode;
  variant?: "neutral" | "info" | "success" | "warning" | "error" | "blue" | "teal" | "orange" | "purple";
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Standard Civic Badge adhering to Meta Astryx principles:
 * - High contrast WCAG AAA
 * - Semantic coloring (success, warning, error, neutral)
 * - Clear count / status indication
 */
export function AstryxBadge({
  label,
  variant = "neutral",
  icon,
  className = ""
}: CivicBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <CoreBadge
        label={label}
        variant={variant}
        icon={icon}
      />
    </span>
  );
}

export interface CivicButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Civic Button powered by Meta Astryx Button component
 * Accessible, focusable, keyboard navigable, built-in loading spinner
 */
export function AstryxButton({
  label,
  variant = "secondary",
  size = "md",
  icon,
  isLoading,
  isDisabled,
  onClick,
  className = "",
  children
}: CivicButtonProps) {
  return (
    <span className={`inline-block ${className}`}>
      <CoreButton
        label={label}
        variant={variant}
        size={size}
        icon={icon}
        isLoading={isLoading}
        isDisabled={isDisabled}
        onClick={onClick}
      >
        {children}
      </CoreButton>
    </span>
  );
}
