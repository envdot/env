import React from 'react';

// ============================================
// CLOUD & INFRASTRUCTURE
// ============================================

// Cloudflare logo
export const CloudflareIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M16.509 16.845c.114-.393.047-.746-.188-1.012-.223-.246-.57-.386-.982-.406l-7.647-.036a.187.187 0 01-.155-.075.192.192 0 01-.03-.185c.018-.134.135-.242.277-.247l7.725-.036c.885-.035 1.84-.735 2.164-1.577l.422-1.091a.198.198 0 00.009-.146 5.403 5.403 0 00-10.4.69c-.58-.434-1.315-.656-2.086-.58-1.329.13-2.403 1.207-2.52 2.54a3.06 3.06 0 00.106 1.063 3.795 3.795 0 00-3.55 3.787c0 .092.004.183.01.273a.2.2 0 00.192.168h15.8a.298.298 0 00.287-.218.315.315 0 00.025-.088l.041-.328z" fill="#F6821F"/>
    <path d="M18.606 11.067a.113.113 0 00-.104-.04l-.886.073a.297.297 0 01-.243-.11.296.296 0 01-.06-.254c.082-.308.089-.635.015-.958a2.154 2.154 0 00-1.61-1.613 2.156 2.156 0 00-2.184.737l-.004.003a1.953 1.953 0 00-.263.407.113.113 0 00.089.157l5.072.31a.115.115 0 00.113-.07c.04-.114.063-.222.073-.328a.113.113 0 00-.008-.064z" fill="#FAAD3F"/>
    <path d="M19.82 14.867a.2.2 0 00-.192-.168H4.628a.298.298 0 01-.287-.218.315.315 0 010-.218.298.298 0 01.287-.218h15a.2.2 0 00.192-.168c.006-.045.01-.091.01-.137a3.795 3.795 0 00-3.56-3.787 3.06 3.06 0 00-.106-1.063c-.117-1.333-1.19-2.41-2.52-2.54a2.914 2.914 0 00-2.086.58 5.403 5.403 0 00-10.4-.69.198.198 0 00.009.146l.422 1.091c.323.842 1.279 1.542 2.164 1.577l7.725.036c.142.005.259.113.277.247a.192.192 0 01-.03.185.187.187 0 01-.155.075l-7.647.036c-.412.02-.76.16-.982.406-.235.266-.302.619-.188 1.012.006.03.014.059.025.088a.298.298 0 00.287.218h15.8a.2.2 0 00.192-.168c.006-.09.01-.181.01-.273z" fill="#F6821F"/>
  </svg>
);

// Vercel logo
export const VercelIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L2 19.5h20L12 2z"/>
  </svg>
);

// Netlify logo
export const NetlifyIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M17.372 5.398l-5.258-3.15a2.16 2.16 0 00-2.228 0L4.628 5.398a2.205 2.205 0 00-1.114 1.918v6.368c0 .79.424 1.52 1.114 1.918l5.258 3.15a2.16 2.16 0 002.228 0l5.258-3.15a2.205 2.205 0 001.114-1.918V7.316a2.205 2.205 0 00-1.114-1.918z" fill="#00C7B7"/>
    <path d="M12 8.5L8 11l4 2.5 4-2.5-4-2.5z" fill="#fff"/>
  </svg>
);

// Supabase logo
export const SupabaseIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M13.5 21.875c-.542.73-1.682.214-1.654-.749l.487-16.857c.028-.959 1.212-1.344 1.741-.566l7.55 11.09c.537.79-.044 1.857-.988 1.857h-7.136z" fill="url(#supabase-a)"/>
    <path d="M10.5 2.125c.542-.73 1.682-.214 1.654.749l-.345 16.857c-.028.959-1.354 1.344-1.883.566L2.376 9.207c-.537-.79.044-1.857.988-1.857h7.136z" fill="#3ECF8E"/>
    <defs>
      <linearGradient id="supabase-a" x1="13.5" y1="4" x2="21" y2="17" gradientUnits="userSpaceOnUse">
        <stop stopColor="#249361"/>
        <stop offset="1" stopColor="#3ECF8E"/>
      </linearGradient>
    </defs>
  </svg>
);

// Firebase logo
export const FirebaseIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4.5 19.5l1.75-14.27a.5.5 0 01.93-.19l1.82 3.43 1.35-2.58a.5.5 0 01.9 0l7.25 13.6H4.5z" fill="#FFA000"/>
    <path d="M12.75 11.4l-2.5-4.55-5.75 12.65 8.25-8.1z" fill="#F57C00"/>
    <path d="M18.5 19.5l-2.2-13.68a.5.5 0 00-.95-.1L4.5 19.5l6.35 3.65a1 1 0 001 0l6.65-3.65z" fill="#FFCA28"/>
  </svg>
);

// AWS logo
export const AWSIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M7.164 11.265l-.758 2.77-.735-2.77H4.5l1.25 4.5h1.148l.768-2.703.768 2.703h1.148l1.25-4.5h-1.17l-.735 2.77-.758-2.77h-1zM12.453 14.108l-.15.54h-.03l-.15-.54-.63-2.843h-1.2l1.23 4.5h1.44l1.23-4.5h-1.2l-.54 2.843zM16.883 12.848c-.18-.27-.42-.45-.72-.54a1.85 1.85 0 00-.63-.09c-.255 0-.488.03-.697.09a1.5 1.5 0 00-.54.27.85.85 0 00-.263.42h1.02c.03-.06.082-.105.158-.135a.567.567 0 01.232-.045c.105 0 .188.023.248.068.06.045.09.113.09.203 0 .075-.045.135-.135.18-.09.045-.225.083-.405.113-.18.03-.337.06-.472.09a1.57 1.57 0 00-.405.15.78.78 0 00-.27.27.84.84 0 00-.098.42c0 .18.038.33.113.45.075.12.18.21.315.27a1.2 1.2 0 00.45.09c.195 0 .36-.037.495-.112a.9.9 0 00.315-.293h.03l.06.345h1.02v-1.8c0-.285-.068-.51-.203-.675zm-.87 1.26a.355.355 0 01-.158.18.495.495 0 01-.262.068c-.09 0-.165-.023-.225-.068a.227.227 0 01-.09-.187c0-.105.045-.18.135-.225.09-.045.21-.083.36-.113l.24-.045v.39z" fill="#252F3E"/>
    <path d="M17.16 17.4c-1.53.9-3.75 1.38-5.67 1.38-2.68 0-5.1-.79-6.93-2.1-.14-.1-.02-.25.16-.17 1.97.92 4.41 1.47 6.93 1.47 1.7 0 3.57-.28 5.29-.86.26-.09.48.17.22.38z" fill="#FF9900"/>
    <path d="M17.79 16.68c-.2-.2-.13-.48.04-.48.26 0 .52.26.7.48.18.22.22.44.22.7s-.33.48-.59.26c-.26-.22-.37-.96-.37-.96z" fill="#FF9900"/>
  </svg>
);

// Docker logo
export const DockerIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#2496ED" className={className}>
    <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.12a.186.186 0 00-.185.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z"/>
  </svg>
);

// Kubernetes logo
export const KubernetesIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#326CE5" className={className}>
    <path d="M12 0L1.608 6v12L12 24l10.392-6V6L12 0zm-.037 3.925a.752.752 0 01.634.392l1.356 2.637.029-.001c.16 0 .318.013.472.038l1.841-2.25a.754.754 0 011.216.867l-1.547 2.498c.168.196.313.411.432.642l2.811.315a.753.753 0 01-.168 1.496l-2.93.072a3.04 3.04 0 01-.156.682l2.252 1.79a.752.752 0 01-.935 1.18l-2.5-1.607a3.04 3.04 0 01-.509.398l.695 2.834a.752.752 0 01-1.462.358l-1.005-2.703a3.07 3.07 0 01-.61 0l-1.005 2.703a.752.752 0 01-1.462-.358l.695-2.834a3.04 3.04 0 01-.509-.398l-2.5 1.607a.752.752 0 01-.935-1.18l2.252-1.79a3.04 3.04 0 01-.156-.682l-2.93-.072a.753.753 0 01-.168-1.496l2.811-.315c.119-.231.264-.446.432-.642L5.59 5.608a.754.754 0 011.216-.867l1.841 2.25c.154-.025.312-.038.472-.038l.029.001 1.356-2.637a.752.752 0 01.533-.392z"/>
  </svg>
);

// Terraform logo
export const TerraformIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#7B42BC" className={className}>
    <path d="M1 4.5v5.5l4.8 2.8V7.2L1 4.5z"/>
    <path d="M6.5 7.3v5.5l4.8-2.8V4.5L6.5 7.3z"/>
    <path d="M6.5 13.5v5.6l4.8 2.8v-5.6l-4.8-2.8z"/>
    <path d="M12 10v5.6l4.8-2.8V7.2L12 10z"/>
  </svg>
);

// ============================================
// DEVELOPMENT & VERSION CONTROL
// ============================================

// GitHub logo
export const GitHubIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

// GitLab logo
export const GitLabIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51a.42.42 0 01.4-.29.43.43 0 01.41.29l2.44 7.51h8.08l2.44-7.51a.42.42 0 01.4-.29.43.43 0 01.41.29l2.44 7.51 1.22 3.78a.84.84 0 01-.3.94z" fill="#E24329"/>
    <path d="M12 22.13L16.08 9.67H7.92L12 22.13z" fill="#FC6D26"/>
    <path d="M12 22.13L7.92 9.67H2.27l1.22 3.78L12 22.13z" fill="#FCA326"/>
    <path d="M2.27 9.67L1.05 13.45a.84.84 0 00.3.94L12 22.13 2.27 9.67z" fill="#E24329"/>
    <path d="M2.27 9.67h5.65L5.48 2.16a.42.42 0 00-.4-.29.43.43 0 00-.41.29L2.27 9.67z" fill="#FC6D26"/>
    <path d="M12 22.13l4.08-12.46h5.65l-1.22 3.78L12 22.13z" fill="#FCA326"/>
    <path d="M21.73 9.67l1.22 3.78a.84.84 0 01-.3.94L12 22.13l9.73-12.46z" fill="#E24329"/>
    <path d="M21.73 9.67h-5.65l2.44-7.51a.42.42 0 01.4-.29.43.43 0 01.41.29l2.4 7.51z" fill="#FC6D26"/>
  </svg>
);

// Bitbucket logo
export const BitbucketIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#2684FF" className={className}>
    <path d="M2.652 2.004A.655.655 0 002 2.665v.013l2.73 16.557a.89.89 0 00.869.74h12.976a.656.656 0 00.653-.548l2.73-16.762a.655.655 0 00-.648-.76l-18.658.1zm11.142 11.646H9.97l-.85-4.413h4.92l-.246 4.413z"/>
  </svg>
);

// Git icon
export const GitIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#F05032" className={className}>
    <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.342.203.488.348.713.721.713 1.883 0 2.6-.719.721-1.889.721-2.609 0-.719-.719-.719-1.879 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187"/>
  </svg>
);

// NPM logo
export const NPMIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#CB3837" className={className}>
    <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331z"/>
  </svg>
);

// ============================================
// COMMUNICATION
// ============================================

// Slack logo
export const SlackIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
    <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
  </svg>
);

// Discord logo
export const DiscordIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2" className={className}>
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

// Microsoft Teams logo
export const TeamsIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M20.625 8.25h-4.5V6a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5v2.25z" fill="#5059C9"/>
    <circle cx="17.625" cy="3" r="1.5" fill="#5059C9"/>
    <path d="M16.125 8.25H8.625a1.5 1.5 0 00-1.5 1.5v6.75a4.5 4.5 0 004.5 4.5h1.5a4.5 4.5 0 004.5-4.5V9.75a1.5 1.5 0 00-1.5-1.5z" fill="#7B83EB"/>
    <circle cx="12.375" cy="4.5" r="2.25" fill="#7B83EB"/>
    <path d="M9.375 12v4.5M12.375 11.25V15M15.375 12v4.5" stroke="#fff" strokeWidth="1.2"/>
  </svg>
);

// Email icon
export const EmailIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

// ============================================
// PRODUCTIVITY
// ============================================

// Notion logo
export const NotionIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.934-.56.934-1.166V6.354c0-.606-.233-.933-.747-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.934-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.513.28-.886.747-.933l3.222-.186z"/>
  </svg>
);

// Linear logo
export const LinearIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#5E6AD2" className={className}>
    <path d="M3.03 9.97a9.001 9.001 0 0 1 11 11l-11-11zm-1.02 4.25A9 9 0 0 0 9.78 21.99l-7.77-7.77zm1.89-6.34a9 9 0 0 1 12.22 12.22L3.9 7.88zm2.05-1.74a9.002 9.002 0 0 1 10.1 10.1L5.97 6.14zm2.67-1.53a9 9 0 0 1 7.72 7.72l-7.72-7.72z"/>
  </svg>
);

// Asana logo
export const AsanaIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="6.5" r="4.5" fill="#F06A6A"/>
    <circle cx="5.5" cy="15.5" r="4.5" fill="#F06A6A"/>
    <circle cx="18.5" cy="15.5" r="4.5" fill="#F06A6A"/>
  </svg>
);

// Monday.com logo
export const MondayIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="4" width="6" height="16" rx="3" fill="#FF3D57"/>
    <rect x="9" y="8" width="6" height="12" rx="3" fill="#FFCB00"/>
    <rect x="16" y="12" width="6" height="8" rx="3" fill="#00D647"/>
  </svg>
);

// Jira logo
export const JiraIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12.005 2L2.59 11.414a2.01 2.01 0 000 2.828l9.4 9.4L21.4 14.24a2.01 2.01 0 000-2.829L12.005 2z" fill="#2684FF"/>
    <path d="M12.005 8.354a5.65 5.65 0 00-.015 7.996l4.004-4.005-3.989-3.99z" fill="url(#jira-a)"/>
    <path d="M12.005 15.646l-4.01-4.004a5.649 5.649 0 00.01 7.995l4-3.99z" fill="url(#jira-b)"/>
    <defs>
      <linearGradient id="jira-a" x1="11.99" y1="10.81" x2="8.6" y2="14.18" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0052CC"/>
        <stop offset="1" stopColor="#2684FF"/>
      </linearGradient>
      <linearGradient id="jira-b" x1="12.02" y1="13.19" x2="15.39" y2="9.83" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0052CC"/>
        <stop offset="1" stopColor="#2684FF"/>
      </linearGradient>
    </defs>
  </svg>
);

// Confluence logo
export const ConfluenceIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2.306 18.39c-.18.31-.38.66-.56.99a.584.584 0 00.22.8l4.14 2.52c.27.16.62.08.8-.18.16-.27.35-.58.56-.93 1.45-2.39 2.91-2.1 5.53-.81l4.16 2.03c.3.14.66.03.82-.26l2.13-4.27a.592.592 0 00-.24-.77c-1.21-.6-3.56-1.74-5.55-2.71-5.11-2.49-9.29-2.1-11.97 2.59z" fill="url(#confluence-a)"/>
    <path d="M21.694 5.61c.18-.31.38-.66.56-.99a.584.584 0 00-.22-.8l-4.14-2.52a.592.592 0 00-.8.18c-.16.27-.35.58-.56.93-1.45 2.39-2.91 2.1-5.53.81L6.814.19a.593.593 0 00-.82.26l-2.13 4.27c-.14.29-.03.65.24.77 1.21.6 3.56 1.74 5.55 2.71 5.11 2.49 9.29 2.1 11.97-2.59z" fill="url(#confluence-b)"/>
    <defs>
      <linearGradient id="confluence-a" x1="21.34" y1="22.13" x2="9.3" y2="15.16" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0052CC"/>
        <stop offset="1" stopColor="#2684FF"/>
      </linearGradient>
      <linearGradient id="confluence-b" x1="2.66" y1="1.87" x2="14.7" y2="8.84" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0052CC"/>
        <stop offset="1" stopColor="#2684FF"/>
      </linearGradient>
    </defs>
  </svg>
);

// Trello logo
export const TrelloIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0079BF" className={className}>
    <path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM10 17a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1h3a1 1 0 011 1v11zm9-4a1 1 0 01-1 1h-3a1 1 0 01-1-1V6a1 1 0 011-1h3a1 1 0 011 1v7z"/>
  </svg>
);

// Airtable logo
export const AirtableIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M11.094 2.236L3.13 5.333a.5.5 0 000 .934l7.965 3.097a2.5 2.5 0 001.81 0l7.965-3.097a.5.5 0 000-.934l-7.966-3.097a2.5 2.5 0 00-1.81 0z" fill="#FCB400"/>
    <path d="M12.75 11.35V21.5a.5.5 0 00.682.465l8.5-3.4a.5.5 0 00.318-.465v-10.15a.5.5 0 00-.682-.465l-8.5 3.4a.5.5 0 00-.318.465z" fill="#18BFFF"/>
    <path d="M11.25 11.35V21.5a.5.5 0 01-.682.465l-8.5-3.4A.5.5 0 011.75 18.1V7.95a.5.5 0 01.682-.465l8.5 3.4a.5.5 0 01.318.465z" fill="#F82B60"/>
  </svg>
);

// Todoist logo
export const TodoistIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#E44332" className={className}>
    <path d="M21 0H3a3 3 0 00-3 3v18a3 3 0 003 3h18a3 3 0 003-3V3a3 3 0 00-3-3zM9.3 17.7l-4.2-4.2 1.5-1.5 2.7 2.7 6.6-6.6 1.5 1.5-8.1 8.1z"/>
  </svg>
);

// Obsidian logo
export const ObsidianIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12.5 1L4 8l4 14 8.5-5L21 8l-8.5-7z" fill="#7C3AED" stroke="#7C3AED" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M12.5 1L8 22M12.5 1L21 8l-4.5 9" stroke="#A78BFA" strokeWidth="1.5"/>
  </svg>
);

// ============================================
// GOOGLE SERVICES
// ============================================

// Google Drive logo
export const GoogleDriveIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8.267 14.68l-1.6 2.773H21.2l1.6-2.773H8.267z" fill="#3777E3"/>
    <path d="M15.067 1.867L8.267 14.68l3.2 5.547 6.8-11.787-3.2-8.573z" fill="#FFCF63"/>
    <path d="M15.067 1.867H8.267L1.2 14.68h7.067l6.8-12.813z" fill="#11A861"/>
  </svg>
);

// Google Calendar logo
export const GoogleCalendarIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2z" fill="#fff"/>
    <path d="M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="#4285F4" strokeWidth="2"/>
    <path d="M16 2v4M8 2v4M4 10h16" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
    <rect x="7" y="12" width="3" height="3" rx="0.5" fill="#EA4335"/>
    <rect x="11" y="12" width="3" height="3" rx="0.5" fill="#FBBC04"/>
    <rect x="15" y="12" width="3" height="3" rx="0.5" fill="#34A853"/>
  </svg>
);

// Gmail logo
export const GmailIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#fff"/>
    <path d="M22 6l-10 7L2 6" stroke="#EA4335" strokeWidth="2"/>
    <path d="M2 6v12a2 2 0 002 2h16a2 2 0 002-2V6" stroke="#4285F4" strokeWidth="2"/>
  </svg>
);

// Google Docs logo
export const GoogleDocsIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" fill="#4285F4"/>
    <path d="M15 2v5h5" fill="#A1C2FA"/>
    <path d="M8 12h8M8 15h8M8 18h5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Google Sheets logo
export const GoogleSheetsIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" fill="#0F9D58"/>
    <path d="M15 2v5h5" fill="#87CEAC"/>
    <rect x="7" y="11" width="10" height="8" rx="1" fill="#fff"/>
    <path d="M12 11v8M7 15h10" stroke="#0F9D58" strokeWidth="1"/>
  </svg>
);

// Google Maps logo
export const GoogleMapsIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
    <circle cx="12" cy="9" r="2.5" fill="#fff"/>
  </svg>
);

// ============================================
// CRM & MARKETING
// ============================================

// HubSpot logo
export const HubSpotIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF7A59" className={className}>
    <path d="M17.5 9.17V5.25a1.75 1.75 0 10-2 0v3.92a4.5 4.5 0 00-2.08 1.52l-5.59-3.4a2 2 0 10-1 1.74l5.51 3.36A4.5 4.5 0 1017.5 9.17zM15.5 16a2 2 0 110-4 2 2 0 010 4z"/>
  </svg>
);

// Salesforce logo
export const SalesforceIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M10 5.5a4.5 4.5 0 017.9 3A3.5 3.5 0 0121 12a3.5 3.5 0 01-3 3.46 4.5 4.5 0 01-8.5 1.04 4 4 0 01-5.5-4 4 4 0 014-4c.18 0 .35.01.52.04A4.5 4.5 0 0110 5.5z" fill="#00A1E0"/>
  </svg>
);

// Mailchimp logo
export const MailchimpIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFE01B" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h-1.5v-1.5H11V16zm0-3h-1.5V8H11v5zm4 3h-1.5v-1.5H14V16zm0-3h-1.5V8H14v5z"/>
  </svg>
);

// ============================================
// ANALYTICS & MONITORING
// ============================================

// Amplitude logo
export const AmplitudeIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#1565C0" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 16l4-8 4 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

// Mixpanel logo
export const MixpanelIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#7856FF" className={className}>
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
    <path d="M12 12l10-5M12 12v10M12 12L2 7" stroke="#fff" strokeWidth="1"/>
  </svg>
);

// Sentry logo
export const SentryIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#362D59" className={className}>
    <path d="M13.91 2.45c-.58-1-2.03-1-2.6 0L1.47 19.38A1.5 1.5 0 002.76 21.8h5.98a1.5 1.5 0 001.3-.75l.13-.23a6.03 6.03 0 00-3.67 5.18h-2a8.03 8.03 0 014.93-7.22l1.08-1.87a4.02 4.02 0 00-3.23 3.9H5.63a6.03 6.03 0 015.1-5.93l4.48-7.76a1.5 1.5 0 012.6 0l4.72 8.17h-3l-3.62-6.27z"/>
  </svg>
);

// Datadog logo
export const DatadogIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#632CA6" className={className}>
    <path d="M18.92 12.72l-.76-.51-.1-.59.44-.49c.22-.24.32-.5.27-.82-.05-.32-.25-.52-.46-.68l-.8-.6-.03-.65.4-.53c.2-.26.28-.54.2-.85-.08-.31-.3-.5-.54-.64l-.86-.5-.04-.62.38-.56c.18-.27.24-.56.14-.87-.1-.3-.34-.48-.6-.6L15.3 4l-.08-.6.35-.57c.16-.28.2-.58.06-.88-.13-.3-.4-.46-.68-.56L14.08 2l-.14-.55.3-.57c.14-.28.15-.58-.02-.87-.17-.29-.46-.43-.77-.5l-.52-.1v.18c-.39-.03-.68.1-.87.38-.16.24-.18.52-.13.79l.1.42-.42.3c-.28.2-.43.5-.35.87l.13.64-.46.28c-.29.17-.48.45-.44.84l.08.66-.48.27c-.3.16-.52.42-.5.81l.04.65-.5.28c-.3.16-.54.41-.55.8v.66l-.51.3c-.3.17-.55.42-.57.81l-.03.65-.52.33c-.3.19-.54.45-.54.84l.02.64-.53.36c-.28.2-.51.47-.49.86l.06.63-.52.4c-.27.21-.47.5-.43.89l.1.62-.5.44c-.25.23-.42.53-.35.92l.15.6-.46.47c-.22.25-.35.57-.24.95l.2.58-.42.5c-.19.27-.27.6-.12.97l.26.55-.36.53c-.15.29-.18.63.02.98l.33.5-.28.55c-.1.3-.07.65.18.96l.39.45-.19.56c-.05.31.05.65.35.92l.45.39-.09.57c0 .32.17.64.52.85l.5.32.02.56c.06.32.3.61.67.75l.53.22.13.54c.11.31.4.55.78.6l.53.09.24.5c.17.28.48.45.86.43l.5-.03.33.44c.22.25.55.36.92.26l.46-.13.42.36c.27.2.61.23.95.06l.41-.23.48.26c.31.14.63.09.93-.14l.35-.31.53.15c.32.08.63-.03.88-.29l.28-.38.55.03c.32.02.6-.16.8-.47l.19-.43.55-.1c.31-.05.56-.28.69-.62l.1-.46.53-.22c.29-.13.49-.4.55-.76l0-.47.49-.33c.26-.19.4-.5.38-.86l-.1-.45.42-.42c.22-.25.29-.59.19-.93l-.2-.43.34-.49c.17-.29.17-.63-.02-.94l-.29-.39.24-.54c.11-.31.04-.65-.21-.92l-.37-.34.14-.56c.05-.32-.1-.64-.42-.87l-.44-.27.03-.56c-.02-.32-.24-.61-.58-.78l-.49-.19-.08-.55c-.08-.31-.36-.57-.72-.67l-.51-.11-.19-.51c-.15-.29-.46-.49-.82-.52l-.52-.01-.29-.46c-.2-.27-.54-.4-.9-.33l-.5.09-.38-.4c-.25-.24-.6-.3-.94-.15l-.46.2-.45-.31c-.28-.19-.63-.18-.93.05l-.4.29z"/>
  </svg>
);

// Grafana logo
export const GrafanaIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#F46800" className={className}>
    <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10zm-10-7a7 7 0 100 14 7 7 0 000-14zm0 2a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z"/>
  </svg>
);

// ============================================
// CI/CD & DevOps
// ============================================

// CircleCI logo
export const CircleCIIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#343434" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15a5 5 0 110-10 5 5 0 010 10z"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

// ============================================
// PAYMENTS & FINANCE
// ============================================

// Stripe logo
export const StripeIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#635BFF" className={className}>
    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
  </svg>
);

// Yahoo Finance logo
export const YahooFinanceIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#720E9E" className={className}>
    <path d="M2 4l6 8v8h4v-8l6-8h-4.5L10 9.5 6.5 4H2z"/>
    <circle cx="18" cy="17" r="3" fill="#720E9E"/>
  </svg>
);

// Alpha Vantage logo (stock chart icon)
export const AlphaVantageIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

// ============================================
// DESIGN
// ============================================

// Figma logo
export const FigmaIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8 24c2.208 0 4-1.792 4-4v-4H8c-2.208 0-4 1.792-4 4s1.792 4 4 4z" fill="#0ACF83"/>
    <path d="M4 12c0-2.208 1.792-4 4-4h4v8H8c-2.208 0-4-1.792-4-4z" fill="#A259FF"/>
    <path d="M4 4c0-2.208 1.792-4 4-4h4v8H8C5.792 8 4 6.208 4 4z" fill="#F24E1E"/>
    <path d="M12 0h4c2.208 0 4 1.792 4 4s-1.792 4-4 4h-4V0z" fill="#FF7262"/>
    <path d="M20 12c0 2.208-1.792 4-4 4s-4-1.792-4-4 1.792-4 4-4 4 1.792 4 4z" fill="#1ABCFE"/>
  </svg>
);

// Canva logo
export const CanvaIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#00C4CC"/>
    <circle cx="12" cy="12" r="4" fill="#7D2AE7"/>
    <circle cx="12" cy="12" r="1.5" fill="#fff"/>
  </svg>
);

// ============================================
// AI & ML
// ============================================

// Hugging Face logo
export const HuggingFaceIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFD21E" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    <path d="M8.5 10c-.28 0-.5.22-.5.5v1c0 .28.22.5.5.5s.5-.22.5-.5v-1c0-.28-.22-.5-.5-.5zM15.5 10c-.28 0-.5.22-.5.5v1c0 .28.22.5.5.5s.5-.22.5-.5v-1c0-.28-.22-.5-.5-.5z" fill="#000"/>
  </svg>
);

// Replicate logo
export const ReplicateIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1" opacity="0.5"/>
  </svg>
);

// DALL-E / OpenAI logo
export const OpenAIIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 0012 .935a6.065 6.065 0 00-5.663 3.976 6.046 6.046 0 00-4.058 2.929 5.986 5.986 0 00.737 7.039 5.985 5.985 0 00.516 4.91 6.046 6.046 0 006.51 2.9A6.065 6.065 0 0012 23.065a6.065 6.065 0 005.663-3.976 6.046 6.046 0 004.058-2.929 5.986 5.986 0 00-.737-7.039h.298zm-1.929 1.618l-6.353 3.67V9.54l6.353 3.67v-1.771z"/>
  </svg>
);

// Stable Diffusion / Stability AI logo
export const StabilityIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L4 6v12l8 4 8-4V6l-8-4z" fill="#7C3AED"/>
    <path d="M12 2v20M4 6l8 4 8-4M4 18l8-4 8 4" stroke="#fff" strokeWidth="1.5"/>
  </svg>
);

// ============================================
// AUTOMATION
// ============================================

// Zapier logo
export const ZapierIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF4A00" className={className}>
    <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z"/>
  </svg>
);

// Make (Integromat) logo
export const MakeIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="6" cy="12" r="4" fill="#6D4AFF"/>
    <circle cx="18" cy="12" r="4" fill="#6D4AFF"/>
    <circle cx="12" cy="6" r="4" fill="#00B4B4"/>
    <circle cx="12" cy="18" r="4" fill="#00B4B4"/>
  </svg>
);

// Puppeteer icon
export const PuppeteerIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#00D8A2" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <circle cx="9" cy="10" r="1.5" fill="#fff"/>
    <circle cx="15" cy="10" r="1.5" fill="#fff"/>
    <path d="M8 15c1.5 2 6.5 2 8 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
);

// Playwright logo
export const PlaywrightIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#2EAD33" className={className}>
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
    <path d="M12 12L2 7M12 12v10M12 12l10-5" stroke="#fff" strokeWidth="1.5"/>
  </svg>
);

// Browserbase logo
export const BrowserbaseIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <path d="M3 9h18"/>
    <circle cx="7" cy="6.5" r="0.5" fill="currentColor"/>
    <circle cx="10" cy="6.5" r="0.5" fill="currentColor"/>
  </svg>
);

// ============================================
// WEB SCRAPING & DATA
// ============================================

// Firecrawl logo
export const FirecrawlIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF6B35" className={className}>
    <path d="M12 2c-1 2-2 3-2 5 0 2 1 3 2 4-1-1-2-2-2-4 0-1 1-3 2-5zm-4 6c-.5 1-1 2-1 3 0 1.5 1 2.5 1 3.5-.5-.5-1-1.5-1-2.5 0-1 .5-2.5 1-4zm8 0c.5 1 1 2 1 3 0 1.5-1 2.5-1 3.5.5-.5 1-1.5 1-2.5 0-1-.5-2.5-1-4zm-4 4c-2 3-3 5-3 8h6c0-3-1-5-3-8z"/>
  </svg>
);

// Apify logo
export const ApifyIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#97D700" className={className}>
    <path d="M12 2L4 6v12l8 4 8-4V6l-8-4zm0 4l4 2v4l-4 2-4-2V8l4-2z"/>
  </svg>
);

// ============================================
// SEARCH
// ============================================

// Brave Search icon
export const BraveIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FB542B" className={className}>
    <path d="M12 2L4 6v8c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 4l4 2v4c0 2.76-1.79 5.35-4 6-2.21-.65-4-3.24-4-6V8l4-2z"/>
  </svg>
);

// Exa logo
export const ExaIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#5046E5" className={className}>
    <path d="M12 2L2 12l10 10 10-10L12 2zm0 4l6 6-6 6-6-6 6-6z"/>
  </svg>
);

// Tavily logo
export const TavilyIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#2563EB" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

// Kagi logo
export const KagiIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFB319" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

// ============================================
// DATABASES
// ============================================

// SQLite icon
export const SQLiteIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#003B57" className={className}>
    <path d="M12 2C8.13 2 5 5.13 5 9v6c0 3.87 3.13 7 7 7s7-3.13 7-7V9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5v1H7V9c0-2.76 2.24-5 5-5zm0 16c-2.76 0-5-2.24-5-5v-3h10v3c0 2.76-2.24 5-5 5z"/>
  </svg>
);

// PostgreSQL icon
export const PostgreSQLIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#336791" className={className}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 13h-4v-1h4v1zm1.07-3H8.93A5.01 5.01 0 017 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.61-.77 3.04-1.93 4z"/>
  </svg>
);

// MySQL icon
export const MySQLIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#4479A1" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
  </svg>
);

// MongoDB icon
export const MongoDBIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#47A248" className={className}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
);

// Redis icon
export const RedisIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#DC382D" className={className}>
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 15l-6-3V9l6-3 6 3v5l-6 3z"/>
  </svg>
);

// ============================================
// MEDIA & CONTENT
// ============================================

// YouTube icon
export const YouTubeIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// Spotify icon
export const SpotifyIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#1DB954" className={className}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

// ============================================
// KNOWLEDGE & RESEARCH
// ============================================

// Wikipedia icon
export const WikipediaIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l2.681-5.927-2.12-4.453c-.237-.541-.493-.9-.769-1.075-.276-.176-.691-.263-1.245-.263h-.18c-.15 0-.225-.057-.225-.176v-.434l.051-.045c.924-.005 4.727 0 4.727 0l.051.045v.434c0 .119-.075.176-.225.176-.705.015-1.057.125-1.057.33 0 .098.034.215.105.346l1.582 3.331 1.57-3.442c.06-.128.09-.243.09-.346 0-.205-.352-.315-1.057-.33-.15 0-.225-.057-.225-.176v-.434l.051-.045c.924-.005 3.947 0 3.947 0l.051.045v.434c0 .119-.075.176-.225.176-.554.015-.976.091-1.265.225-.289.135-.564.457-.821.961l-2.331 5.16 2.801 5.985s3.751-8.055 4.863-10.521c.113-.271.166-.466.166-.601 0-.272-.242-.407-.727-.436l-.564-.031c-.15 0-.225-.057-.225-.176v-.434l.051-.045s4.477-.005 5.401 0l.052.045v.455c0 .084-.103.135-.307.159-.568.031-.941.121-1.122.271-.178.152-.368.538-.619 1.139-1.358 3.265-4.245 9.088-5.651 12.409-.405.902-.916 1.045-1.532-.029-.636-1.18-1.917-3.796-2.853-5.728z"/>
  </svg>
);

// arXiv icon
export const ArxivIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#B31B1B" className={className}>
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
);

// PubMed icon
export const PubMedIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#326599" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2V7h2v10z"/>
  </svg>
);

// ============================================
// MAPS & LOCATION
// ============================================

// Mapbox icon
export const MapboxIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#000" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);

// ============================================
// SOCIAL MEDIA
// ============================================

// X (Twitter) icon
export const TwitterIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// LinkedIn icon
export const LinkedInIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

// ============================================
// SYSTEM & UTILITY
// ============================================

// Filesystem icon
export const FilesystemIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

// Memory/Brain icon
export const MemoryIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54"/>
  </svg>
);

// Time icon
export const TimeIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// Sequential Thinking icon
export const SequentialThinkingIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="12" r="3"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <polyline points="13 9 15 12 13 15"/>
  </svg>
);

// Everything (test) icon
export const EverythingIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>
);

// Shell/Terminal icon
export const ShellIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 17 10 11 4 5"/>
    <line x1="12" y1="19" x2="20" y2="19"/>
  </svg>
);

// macOS icon
export const MacOSIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

// Fetch/Web icon
export const FetchIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

// Custom/Wrench icon
export const CustomIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);

// Generic/Default icon for unknown services
export const DefaultIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4M12 8h.01"/>
  </svg>
);

// ============================================
// ICON MAPPING
// ============================================

// Map of icon IDs to components
export const MCP_ICONS = {
  // Cloud
  'cloudflare-mcp': CloudflareIcon,
  'vercel-mcp': VercelIcon,
  'netlify-mcp': NetlifyIcon,
  'supabase-mcp': SupabaseIcon,
  'firebase-mcp': FirebaseIcon,
  'aws-mcp': AWSIcon,
  'docker-mcp': DockerIcon,
  'kubernetes-mcp': KubernetesIcon,
  'terraform-mcp': TerraformIcon,

  // Development
  'github-mcp': GitHubIcon,
  'github-local-mcp': GitHubIcon,
  'gitlab-mcp': GitLabIcon,
  'bitbucket-mcp': BitbucketIcon,
  'git-mcp': GitIcon,
  'npm-mcp': NPMIcon,

  // Communication
  'slack-mcp': SlackIcon,
  'slack-local-mcp': SlackIcon,
  'discord-mcp': DiscordIcon,
  'teams-mcp': TeamsIcon,
  'email-mcp': EmailIcon,

  // Productivity
  'notion-mcp': NotionIcon,
  'linear-mcp': LinearIcon,
  'asana-mcp': AsanaIcon,
  'monday-mcp': MondayIcon,
  'jira-mcp': JiraIcon,
  'confluence-mcp': ConfluenceIcon,
  'trello-mcp': TrelloIcon,
  'airtable-mcp': AirtableIcon,
  'todoist-mcp': TodoistIcon,
  'obsidian-mcp': ObsidianIcon,

  // Google
  'google-drive-mcp': GoogleDriveIcon,
  'google-calendar-mcp': GoogleCalendarIcon,
  'gmail-mcp': GmailIcon,
  'google-docs-mcp': GoogleDocsIcon,
  'google-sheets-mcp': GoogleSheetsIcon,
  'google-maps-mcp': GoogleMapsIcon,

  // CRM & Marketing
  'hubspot-mcp': HubSpotIcon,
  'salesforce-mcp': SalesforceIcon,
  'mailchimp-mcp': MailchimpIcon,

  // Analytics & Monitoring
  'amplitude-mcp': AmplitudeIcon,
  'mixpanel-mcp': MixpanelIcon,
  'sentry-mcp': SentryIcon,
  'datadog-mcp': DatadogIcon,
  'grafana-mcp': GrafanaIcon,

  // CI/CD
  'circleci-mcp': CircleCIIcon,

  // Finance
  'stripe-mcp': StripeIcon,
  'yahoo-finance-mcp': YahooFinanceIcon,
  'alphavantage-mcp': AlphaVantageIcon,

  // Design
  'figma-mcp': FigmaIcon,
  'canva-mcp': CanvaIcon,

  // AI & ML
  'huggingface-mcp': HuggingFaceIcon,
  'replicate-mcp': ReplicateIcon,
  'dalle-mcp': OpenAIIcon,
  'stable-diffusion-mcp': StabilityIcon,

  // Automation
  'zapier-mcp': ZapierIcon,
  'make-mcp': MakeIcon,
  'puppeteer-mcp': PuppeteerIcon,
  'playwright-mcp': PlaywrightIcon,
  'browserbase-mcp': BrowserbaseIcon,

  // Web scraping
  'firecrawl-mcp': FirecrawlIcon,
  'apify-mcp': ApifyIcon,

  // Search
  'brave-search-mcp': BraveIcon,
  'exa-mcp': ExaIcon,
  'tavily-mcp': TavilyIcon,
  'kagi-mcp': KagiIcon,

  // Databases
  'sqlite-mcp': SQLiteIcon,
  'postgres-mcp': PostgreSQLIcon,
  'mysql-mcp': MySQLIcon,
  'mongodb-mcp': MongoDBIcon,
  'redis-mcp': RedisIcon,

  // Media
  'youtube-mcp': YouTubeIcon,
  'spotify-mcp': SpotifyIcon,

  // Knowledge
  'wikipedia-mcp': WikipediaIcon,
  'arxiv-mcp': ArxivIcon,
  'pubmed-mcp': PubMedIcon,

  // Maps
  'mapbox-mcp': MapboxIcon,

  // Social
  'twitter-mcp': TwitterIcon,
  'linkedin-mcp': LinkedInIcon,

  // System
  'filesystem-mcp': FilesystemIcon,
  'memory-mcp': MemoryIcon,
  'time-mcp': TimeIcon,
  'sequential-thinking-mcp': SequentialThinkingIcon,
  'everything-mcp': EverythingIcon,
  'shell-mcp': ShellIcon,
  'macos-mcp': MacOSIcon,
  'fetch-mcp': FetchIcon,
};

// Helper function to get icon component
export const getMcpIcon = (serverId, size = 24) => {
  const IconComponent = MCP_ICONS[serverId];
  if (IconComponent) {
    return <IconComponent size={size} />;
  }
  // Fallback to default icon for unknown servers
  return <DefaultIcon size={size} />;
};
