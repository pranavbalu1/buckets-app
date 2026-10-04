import * as React from 'react';
import { AuthPage } from '../ui/auth-page';

export function AuthGalleryShowcase() {
  const [activeVariant, setActiveVariant] = React.useState<
    'fintech' | 'cloud' | 'health'
  >('fintech');

  // Example API Integration Handlers
  const handleApiLogin = async (credentials: {
    email: string;
    password: string;
    remember?: boolean;
  }) => {
    console.log('API Login Request:', credentials);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    alert(`Logged in successfully as ${credentials.email}`);
  };

  const handleApiRegister = async (credentials: {
    name: string;
    email: string;
    password: string;
  }) => {
    console.log('API Register Request:', credentials);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    alert(`Registered account for ${credentials.name}`);
  };

  return (
    <div className="space-y-6 p-4">
      {/* Selector Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-7xl mx-auto bg-card p-4 rounded-2xl border border-border/70 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Auth Page Showcase
          </h2>
          <p className="text-xs text-muted-foreground">
            Select a enterprise theme to preview how the custom props adapt.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveVariant('fintech')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all select-none ${
              activeVariant === 'fintech'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
          >
            1. Vance & Sterling
          </button>
          <button
            onClick={() => setActiveVariant('cloud')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all select-none ${
              activeVariant === 'cloud'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
          >
            2. Aetheris Cloud
          </button>
          <button
            onClick={() => setActiveVariant('health')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all select-none ${
              activeVariant === 'health'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
          >
            3. Veridia Bio
          </button>
        </div>
      </div>

      {/* VARIANT 1: CAPITAL / PRIVATE EQUITY */}
      {activeVariant === 'fintech' && (
        <AuthPage
          brandName="Vance & Sterling"
          brandTagline="Global Capital Partners"
          heroTitle={
            <>
              STRATEGIC CAPITAL <br />
              ENGINEERED FOR{' '}
              <span className="italic font-serif text-primary font-normal">
                Enduring Impact
              </span>
            </>
          }
          heroDescription="Private asset management, cross-border equity underwriting, and institutional portfolio intelligence for modern conglomerates."
          heroImageSrc="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop"
          heroBadgeText="GLOBAL PORTFOLIO ENGINE"
          stats={[
            { value: '$48.2bn', label: 'Assets Under Custody' },
            { value: '620+', label: 'Enterprise Ventures' },
            { value: '$18.4bn', label: 'Market Cap' },
          ]}
          onLogin={handleApiLogin}
          onRegister={handleApiRegister}
          onSSOClick={() => alert('SSO Triggered')}
          onGoogleClick={() => alert('Google OAuth Triggered')}
        />
      )}

      {/* VARIANT 2: CLOUD & AI INFRASTRUCTURE */}
      {activeVariant === 'cloud' && (
        <AuthPage
          brandName="Aetheris"
          brandTagline="Distributed Compute Matrix"
          heroTitle={
            <>
              NEURAL GRID <br />
              POWERING THE{' '}
              <span className="italic font-serif text-cyan-400 font-normal">
                Autonomous
              </span>{' '}
              FRONTIER
            </>
          }
          heroDescription="Deploy zero-trust serverless clusters, edge inference engines, and quantum-resistant mesh networks across 140+ global regions."
          heroImageSrc="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop"
          heroBadgeText="HYPER-SCALE MATRIX v4.2"
          stats={[
            { value: '3.8 PFLOPs', label: 'Mesh Throughput' },
            { value: '< 2.1ms', label: 'Global Edge Latency' },
            { value: '99.999%', label: 'Guaranteed SLA' },
          ]}
          onLogin={handleApiLogin}
          onRegister={handleApiRegister}
          onSSOClick={() => alert('SSO Triggered')}
        />
      )}

      {/* VARIANT 3: HEALTH & BIOTECH */}
      {activeVariant === 'health' && (
        <AuthPage
          brandName="Veridia Bio"
          brandTagline="Molecular Therapeutics"
          heroTitle={
            <>
              DECIPHERING LIFE <br />
              THROUGH{' '}
              <span className="italic font-serif text-emerald-400 font-normal">
                Precision Genomics
              </span>
            </>
          }
          heroDescription="Pioneering synthetic biology, automated bio-sequence synthesis, and clinical trial modeling powered by cryptographically secure patient databases."
          heroImageSrc="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=1200&auto=format&fit=crop"
          heroBadgeText="GXP & ISO-27001 CERTIFIED"
          stats={[
            { value: '280+', label: 'Active Therapeutics' },
            { value: '5.1M', label: 'Sequenced Genomes' },
            { value: 'EMA / FDA', label: 'Approved Protocols' },
          ]}
          onLogin={handleApiLogin}
          onRegister={handleApiRegister}
        />
      )}
    </div>
  );
}
