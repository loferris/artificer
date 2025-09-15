/**
 * Shared Button Primitive Component
 * 
 * Provides consistent button styling across terminal and chat modes
 * with variants for different use cases and states.
 */

import React from 'react';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  children,
  className = '',
  ...props
}) => {
  const themeClasses = useTerminalThemeClasses();

  // Base classes for all buttons
  const baseClasses = `
    inline-flex
    items-center
    justify-center
    gap-2
    ${themeClasses.fontMono}
    ${themeClasses.transitionFast}
    ${themeClasses.focusOutline}
    font-medium
    select-none
    relative
    overflow-hidden
  `;

  // Size variants
  const sizeClasses = {
    xs: `${themeClasses.textXs} ${themeClasses.pXs} min-h-[24px]`,
    sm: `${themeClasses.textSm} ${themeClasses.pSm} min-h-[32px]`,
    md: `${themeClasses.textSm} ${themeClasses.pMd} min-h-[40px]`,
    lg: `${themeClasses.textMd} ${themeClasses.pLg} min-h-[48px]`,
  };

  // Variant styles
  const variantClasses = {
    primary: `
      ${themeClasses.accentPrompt}
      bg-current
      ${themeClasses.textPrimary}
      ${themeClasses.radiusMd}
      border
      border-transparent
      hover:opacity-90
      active:scale-95
      shadow-sm
    `,
    secondary: `
      ${themeClasses.bgSecondary}
      ${themeClasses.textSecondary}
      ${themeClasses.borderPrimary}
      ${themeClasses.radiusMd}
      border
      ${themeClasses.hoverBg}
      active:scale-95
    `,
    danger: `
      ${themeClasses.accentError}
      bg-current
      ${themeClasses.textPrimary}
      ${themeClasses.radiusMd}
      border
      border-transparent
      hover:opacity-90
      active:scale-95
      shadow-sm
    `,
    ghost: `
      ${themeClasses.textTertiary}
      ${themeClasses.radiusSm}
      hover:${themeClasses.bgOverlay}
      ${themeClasses.hoverBg}
      active:scale-95
    `,
    icon: `
      ${themeClasses.textTertiary}
      ${themeClasses.radiusSm}
      w-8 h-8
      min-h-[32px]
      p-0
      ${themeClasses.hoverBg}
      hover:${themeClasses.textSecondary}
      active:scale-90
    `,
  };

  // Disabled state
  const disabledClasses = disabled || isLoading ? `
    opacity-50
    cursor-not-allowed
    pointer-events-none
  ` : 'cursor-pointer';

  // Loading spinner
  const LoadingSpinner = () => (
    <div className={`
      w-4 h-4 border-2 border-current border-t-transparent 
      rounded-full animate-spin
    `} />
  );

  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${disabledClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <LoadingSpinner />}
      {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {!isLoading && children && <span className="truncate">{children}</span>}
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};

// Pre-configured button variants for common use cases
export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

export const DangerButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="danger" {...props} />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
);

export const IconButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="icon" {...props} />
);

// Button group for related actions
export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className = '' }) => {
  const themeClasses = useTerminalThemeClasses();
  
  return (
    <div className={`
      flex gap-2 items-center
      ${className}
    `}>
      {children}
    </div>
  );
};