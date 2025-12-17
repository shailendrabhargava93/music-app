import { Box, Typography, Button } from '@mui/material';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const WelcomeScreen = ({ onGetStarted }: WelcomeScreenProps) => {
  return (
    <Box
      sx={{
        height: '100vh',
        background: 'linear-gradient(180deg, #1A1A2E 0%, #0F0F1E 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Image Grid Effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.3,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0, 188, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(138, 43, 226, 0.15) 0%, transparent 50%)',
        }}
      />

      {/* Content Container */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <Box
          component="img"
          src="/wave-logo.png"
          alt="Wave Music"
          sx={{
            width: { xs: 120, sm: 140 },
            height: { xs: 120, sm: 140 },
            objectFit: 'contain',
            mb: 2,
            filter: 'drop-shadow(0 6px 16px rgba(0, 188, 212, 0.5))',
            animation: 'float 3s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': {
                transform: 'translateY(0px)',
              },
              '50%': {
                transform: 'translateY(-10px)',
              },
            },
          }}
        />
        
        {/* App Name */}
        <Typography
          variant="h5"
          sx={{
            color: '#00BCD4',
            fontWeight: 700,
            letterSpacing: 4,
            mb: 5,
            fontSize: { xs: '1.1rem', sm: '1.3rem' },
            textTransform: 'uppercase',
          }}
        >
          Wave Music
        </Typography>

        {/* Main Heading */}
        <Typography
          variant="h2"
          sx={{
            color: '#FFFFFF',
            fontWeight: 700,
            mb: 3,
            lineHeight: 1.3,
            fontSize: { xs: '2rem', sm: '2.5rem' },
          }}
        >
          Enjoy your{' '}
          <Box
            component="span"
            sx={{
              background: 'linear-gradient(90deg, #00BCD4 0%, #8A2BE2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            favorite
          </Box>
          {' '}music
        </Typography>

        {/* Subtitle */}
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            mb: 5,
            fontSize: { xs: '0.95rem', sm: '1.05rem' },
            maxWidth: '320px',
            lineHeight: 1.6,
          }}
        >
          Stream millions of songs and discover new music every day
        </Typography>

        {/* Get Started Button */}
        <Button
          variant="contained"
          onClick={onGetStarted}
          fullWidth
          sx={{
            backgroundColor: '#00BCD4',
            color: '#FFFFFF',
            py: 2.5,
            px: 6,
            borderRadius: '50px',
            fontSize: { xs: '1rem', sm: '1.1rem' },
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: '0 8px 24px rgba(0, 188, 212, 0.4)',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: '#00ACC1',
              boxShadow: '0 12px 32px rgba(0, 188, 212, 0.5)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0px)',
            },
          }}
        >
          Get Started
        </Button>
      </Box>

      {/* Decorative Elements */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: 'linear-gradient(180deg, transparent 0%, rgba(0, 188, 212, 0.1) 100%)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
};

export default WelcomeScreen;
