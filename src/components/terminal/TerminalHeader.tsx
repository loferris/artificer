
import React from 'react';

// This component is simplified for the terminal view.
// It can be used for status indicators or other header info in the future.
interface TerminalHeaderProps {}

export const TerminalHeader: React.FC<TerminalHeaderProps> = () => {
  return (
    <div className="bg-gray-800 p-2 text-xs text-gray-400">
      <span>AI Terminal Interface</span>
    </div>
  );
};
