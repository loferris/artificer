import React from 'react';
import { useTerminalTheme, useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';
import { ThemeSelector } from './ThemeSelector';

interface TerminalHeaderProps {
  showThemeSelector?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  statusText?: string;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  showThemeSelector = true,
  className = '',
  style,
  title = 'AI Terminal Interface',
  statusText,
}) => {
  const { theme } = useTerminalTheme();
  const themeClasses = useTerminalThemeClasses();

  const getStatusIndicator = () => {
    if (statusText) return statusText;
    return 'READY';
  };

  return (
    <div
      className={`
        ${themeClasses.bgPrimary}
        ${themeClasses.borderMuted}
        ${themeClasses.textTertiary}
        ${themeClasses.textXs}
        ${themeClasses.fontMono}
        ${themeClasses.pSm}
        ${themeClasses.transitionFast}
        flex
        items-center
        justify-between
        border-b
        ${className}
      `}
      style={style}
    >
      <div className='flex items-center gap-4'>
        <span className={`${themeClasses.textSecondary} font-medium`}>{title}</span>
        <span className={`${themeClasses.textMuted} text-xs`}>{getStatusIndicator()}</span>
      </div>

      <div className='flex items-center gap-2'>
        {/* System Status Indicators */}
        <div className='flex items-center gap-1'>
          <div
            className={`
              w-2 
              h-2 
              rounded-full 
              ${themeClasses.accentSuccess}
              bg-current
            `}
            title='System Online'
          />
          <span className={`${themeClasses.textMuted} text-xs`}>READY</span>
        </div>

        {/* Theme Selector */}
        {showThemeSelector && <ThemeSelector compact className='ml-2' />}
      </div>
    </div>
  );
};
