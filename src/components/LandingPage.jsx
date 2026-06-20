import { Tag, MapPin, Globe, ShoppingBag } from 'lucide-react';
import './LandingPage.css';

const OrderPage = () => {
  return (
    <div className="app-container" style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '90vh', gap: '32px', alignSelf: 'center' }}>
      {/* Top-right Order Now button */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', paddingBottom: '4px' }}>
        <a
          href="/orders"
          id="btn-order-now-top"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.12) 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            color: '#a5b4fc',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            transition: 'all 0.25s',
            backdropFilter: 'blur(8px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.12))';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <ShoppingBag size={16} /> Order Now
        </a>
      </div>

      <header className="header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        {/* Logo with glow effect */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <div style={{
            position: 'absolute',
            top: '-15px',
            left: '-15px',
            right: '-15px',
            bottom: '-15px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, transparent 70%)',
            borderRadius: '24px',
            filter: 'blur(16px)',
            zIndex: -1
          }} />
          <img 
            src="/full logo.png" 
            alt="I'm here Logo" 
            style={{ 
              width: '180px', 
              height: 'auto', 
              borderRadius: '16px', 
              boxShadow: '0 12px 36px rgba(0,0,0,0.65)', 
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
            }} 
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.06) rotate(1deg)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1) rotate(0deg)'}
          />
        </div>
        
        <h1 style={{ fontSize: '3.6rem', fontWeight: 900, background: 'linear-gradient(135deg, #ffffff 20%, #a5b4fc 60%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
          Smart QR Item Tags
        </h1>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '540px', lineHeight: '1.6', margin: '0 auto' }}>
          Securely connect your physical belongings to your digital space. No apps to download. Just scan, claim, and protect your items.
        </p>
      </header>

      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '24px', marginBottom: '-8px', background: 'linear-gradient(135deg, #ffffff 40%, #f43f5e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        The Problem
      </h2>

      {/* Problem Section */}
      <div className="problem-grid">
        {/* Problem Card 1 */}
        <div className="glass-panel" style={{ 
          padding: '20px', 
          borderRadius: '16px', 
          textAlign: 'justify', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          border: '1px solid rgba(244, 63, 94, 0.15)',
          transition: 'all 0.3s ease' 
        }}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.45)'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.15)'}>
          <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', height: '400px', background: 'rgba(0,0,0,0.2)' }}>
            <img 
              src="/problem s1.png" 
              alt="Lost items situation" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          <div>
            <p style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 500, lineHeight: '1.6', margin: 0, textAlign: 'justify' }}>
              Lost belongings are a common part of everyday life. From forgotten keys to misplaced bags, small mistakes can quickly become frustrating problems.
            </p>
          </div>
        </div>

        {/* Problem Card 2 */}
        <div className="glass-panel" style={{ 
          padding: '20px', 
          borderRadius: '16px', 
          textAlign: 'justify', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          border: '1px solid rgba(244, 63, 94, 0.15)',
          transition: 'all 0.3s ease' 
        }}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.45)'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.15)'}>
          <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', height: '400px', background: 'rgba(0,0,0,0.2)' }}>
            <img 
              src="/problem s2.png" 
              alt="Helpful finder situation" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          <div>
            <p style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 500, lineHeight: '1.6', margin: 0, textAlign: 'justify' }}>
              Many people notice lost belongings and genuinely want to help, but with no way to identify or contact the owner, they simply leave them where they found them.
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '32px', marginBottom: '-8px', background: 'linear-gradient(135deg, #ffffff 40%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        How It Works
      </h2>

      {/* Feature Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px', 
        width: '100%', 
        marginTop: '20px' 
      }}>
        {/* Card 1 */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', textAlign: 'left', transition: 'all 0.3s ease' }}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}>
          <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', marginBottom: '16px' }}>
            <Tag size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>Attach & Protect</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', textAlign: 'justify' }}>
            Secure your valuables with a smart recovery tag. If your item ever goes missing, anyone who finds it can scan the tag to instantly initiate a secure return process.
          </p>
        </div>

        {/* Card 2 */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', textAlign: 'left', transition: 'all 0.3s ease' }}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}>
          <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
            <MapPin size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>Instant Location Ping</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', textAlign: 'justify' }}>
            No need to wait for a phone call to connect. With a single tap, finders can instantly drop their current GPS location, sending an immediate alert straight to your phone.
          </p>
        </div>

        {/* Card 3 */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', textAlign: 'left', transition: 'all 0.3s ease' }}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}>
          <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', marginBottom: '16px' }}>
            <Globe size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>Instant Call & Connect</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', textAlign: 'justify' }}>
            Finders can easily call, email, or message you directly through a simple contact interface. You stay connected and get your items back quickly, without exposing your private details.
          </p>
        </div>
      </div>

      {/* Why Us Section */}
      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '40px', marginBottom: '-8px', background: 'linear-gradient(135deg, #ffffff 40%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Why Us?
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        width: '100%',
        marginTop: '20px'
      }}>
        {/* Ordinary QR Codes Card */}
        <div className="glass-panel" style={{
          padding: '24px',
          borderRadius: '16px',
          textAlign: 'left',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          opacity: 0.7,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', height: '240px', background: 'rgba(255,255,255,0.02)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src="/ordinary_qr.png" 
              alt="Ordinary QR Code" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>Ordinary QR Codes</h3>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-rose)', marginBottom: '16px' }}>Cold, Clinical, and Generic.</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', textAlign: 'justify' }}>
            Traditional black-and-white matrix codes look like barcodes on a shipping label. They ruin the aesthetic of your favorite keys, designer bags, or custom wallets, making security feel like a chore rather than a lifestyle choice.
          </p>
        </div>

        {/* Custom Aesthetic QRs Card */}
        <div className="glass-panel" style={{
          padding: '24px',
          borderRadius: '16px',
          textAlign: 'left',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.15)',
          transition: 'all 0.3s ease'
        }}
             onMouseEnter={(e) => {
               e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)';
               e.currentTarget.style.boxShadow = '0 12px 36px 0 rgba(6, 182, 212, 0.25)';
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
               e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(99, 102, 241, 0.15)';
             }}>
          <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', height: '240px', background: 'rgba(255,255,255,0.02)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src="/customised.png" 
              alt="Custom Aesthetic QR Code" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px', background: 'linear-gradient(135deg, #ffffff 40%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Custom Aesthetic QRs</h3>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '16px' }}>Your Favorite Visuals. Your Safety Net.</h4>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.6', textAlign: 'justify' }}>
            We don't just generate codes; we embed them. Blend your high-contrast QR matrix seamlessly over a picture of your pet, a favorite memory, or custom artwork. It acts as a stunning personal accessory that solves the "what if it's lost" problem beautifully behind the scenes.
          </p>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(6,182,212,0.07) 50%, rgba(139,92,246,0.1) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '24px',
        padding: '40px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: '1.9rem', fontWeight: 900, background: 'linear-gradient(135deg, #ffffff 30%, #a5b4fc 70%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Ready to protect your belongings?
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '400px', lineHeight: '1.6', margin: 0 }}>
          Order your personalised or classic I'm Here Smart QR tag today.
        </p>
        <a
          href="/orders"
          id="btn-order-now-bottom"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 36px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
            color: 'white',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '1.05rem',
            borderRadius: '14px',
            boxShadow: '0 6px 24px rgba(99,102,241,0.4)',
            transition: 'all 0.25s',
            marginTop: '4px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 32px rgba(99,102,241,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.4)';
          }}
        >
          <ShoppingBag size={20} /> Order Your Tag →
        </a>
      </div>

      {/* Footer info */}
      <footer className="policy-footer" style={{ marginTop: '36px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
          © 2026 I'M HERE. Reuniting belongings with their owners.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
          <a href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>Terms & Conditions</a>
          <span style={{ color: 'var(--border-light)' }}>•</span>
          <a href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>Privacy Policy</a>
          <span style={{ color: 'var(--border-light)' }}>•</span>
          <a href="/shipping_policy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>Shipping Policy</a>
          <span style={{ color: 'var(--border-light)' }}>•</span>
          <a href="/refund_policy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>Refund Policy</a>
        </div>
      </footer>
    </div>
  );
};

export default OrderPage;
