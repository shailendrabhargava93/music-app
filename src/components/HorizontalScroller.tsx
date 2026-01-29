import type { ReactNode, Ref } from 'react';
import { Box } from '@mui/material';
import type { SxProps } from '@mui/system';
import type { Theme } from '@mui/material/styles';

interface HorizontalScrollerProps {
  children: ReactNode;
  gap?: number | string;
  px?: number | string;
  py?: number | string;
  hideScrollbar?: boolean;
  refProp?: Ref<HTMLDivElement>;
  className?: string;
  sx?: SxProps<Theme>;
}

const HorizontalScroller: React.FC<HorizontalScrollerProps> = ({ children, gap = 2, px = 2, py = 0, hideScrollbar = true, refProp, className, sx }) => {
  const baseSx: SxProps<Theme> = {
    display: 'flex',
    gap,
    flexWrap: 'nowrap',
    alignItems: 'center',
    px,
    py,
  };

  const hideScrollbarSx: SxProps<Theme> = hideScrollbar
    ? { scrollbarWidth: 'none', msOverflowStyle: 'none', '&::-webkit-scrollbar': { display: 'none' } }
    : {};

  return (
    <Box
      ref={refProp}
      className={className}
      sx={[ { overflowX: 'auto' }, baseSx, hideScrollbarSx, sx ]}
    >
      {children}
    </Box>
  );
};

export default HorizontalScroller;
