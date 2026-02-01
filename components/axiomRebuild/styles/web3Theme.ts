export const web3Theme = {
  colors: {
    primary: '#00D4AA',
    primaryGlow: 'rgba(0, 212, 170, 0.3)',
    secondary: '#FFD700',
    secondaryGlow: 'rgba(255, 215, 0, 0.3)',
    accent: '#7B68EE',
    accentGlow: 'rgba(123, 104, 238, 0.3)',
    dark: '#0A0F1C',
    darkAlt: '#141B2D',
    light: '#FFFFFF',
    muted: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
    glass: 'rgba(255, 255, 255, 0.05)',
    gradientPrimary: 'linear-gradient(135deg, #00D4AA 0%, #00A389 100%)',
    gradientSecondary: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    gradientAccent: 'linear-gradient(135deg, #7B68EE 0%, #6B5DD3 100%)',
    gradientDark: 'linear-gradient(180deg, #0A0F1C 0%, #141B2D 100%)',
    gradientMesh: `
      radial-gradient(at 40% 20%, rgba(0, 212, 170, 0.15) 0px, transparent 50%),
      radial-gradient(at 80% 0%, rgba(123, 104, 238, 0.1) 0px, transparent 50%),
      radial-gradient(at 0% 50%, rgba(255, 215, 0, 0.08) 0px, transparent 50%),
      radial-gradient(at 80% 50%, rgba(0, 212, 170, 0.1) 0px, transparent 50%),
      radial-gradient(at 0% 100%, rgba(123, 104, 238, 0.15) 0px, transparent 50%)
    `
  },
  shadows: {
    glow: '0 0 40px rgba(0, 212, 170, 0.2)',
    glowStrong: '0 0 60px rgba(0, 212, 170, 0.4)',
    card: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
    cardHover: '0 16px 48px rgba(0, 0, 0, 0.16), 0 4px 16px rgba(0, 0, 0, 0.1)',
    depth: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
  },
  borders: {
    glass: '1px solid rgba(255, 255, 255, 0.1)',
    glow: '1px solid rgba(0, 212, 170, 0.3)',
    subtle: '1px solid rgba(0, 0, 0, 0.08)'
  },
  radii: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    full: '9999px'
  },
  spacing: {
    section: '80px',
    container: '1200px'
  },
  animations: {
    float: `
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
    `,
    pulse: `
      @keyframes pulse-glow {
        0%, 100% { opacity: 1; box-shadow: 0 0 20px rgba(0, 212, 170, 0.4); }
        50% { opacity: 0.8; box-shadow: 0 0 40px rgba(0, 212, 170, 0.6); }
      }
    `,
    gradient: `
      @keyframes gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `
  }
};

export const sectionIcons = {
  proof: { icon: '🏛️', emoji: '🌾', label: 'Proven Model' },
  problem: { icon: '🔗', emoji: '⚡', label: 'Structure > Trust' },
  keygrow: { icon: '🌱', emoji: '🏡', label: 'Land Program' },
  infrastructure: { icon: '🚛', emoji: '🔧', label: 'Real Operations' },
  platform: { icon: '⚙️', emoji: '🌐', label: 'Coordination Layer' },
  axm: { icon: '🪙', emoji: '🗳️', label: 'Governance Token' },
  start: { icon: '🚀', emoji: '👥', label: 'Join Us' }
};

export const web3Icons = {
  blockchain: '⛓️',
  wallet: '👛',
  token: '🪙',
  governance: '🗳️',
  defi: '💎',
  nft: '🖼️',
  dao: '🏛️',
  smart: '📜',
  stake: '🔒',
  yield: '📈',
  land: '🌍',
  farm: '🌾',
  home: '🏡',
  truck: '🚛',
  community: '👥',
  rocket: '🚀',
  shield: '🛡️',
  star: '⭐',
  lightning: '⚡',
  chain: '🔗'
};
