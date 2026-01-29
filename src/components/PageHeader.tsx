import React from 'react';
import { Box, Container, IconButton, Typography } from '@mui/material';
import { ArrowBack } from '../icons';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  position?: 'fixed' | 'sticky' | 'static';
  height?: number;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightActions,
  position = 'sticky',
  height = 56,
}) => {
  const header = (
    <Box sx={(theme) => ({
      position: position === 'static' ? 'static' : position,
      top: 0,
      left: 0,
      right: 0,
      zIndex: theme.zIndex.appBar,
      backgroundColor: theme.palette.background.default,
      boxShadow: `0 1px 6px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)'}`,
      py: 0.325,
    })}>
      <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 1, sm: 1.25 } }}>
        {onBack ? (
          <IconButton onClick={onBack} sx={{ color: 'text.primary' }}>
            <ArrowBack />
          </IconButton>
        ) : null}

        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} noWrap>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        <Box sx={{ flex: 1 }} />
        {rightActions}
      </Container>
    </Box>
  );

  if (position === 'fixed') {
    return (
      <>
        {header}
        <Box sx={{ height }} />
      </>
    );
  }

  return header;
};

export default PageHeader;
