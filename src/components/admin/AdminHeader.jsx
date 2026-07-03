import React from 'react';
import { ShoppingBag, Plus, Trash2, LogOut } from 'lucide-react';

const AdminHeader = ({
  activeAdminTab, setActiveAdminTab, orders,
  handleNew, showConfirm, setShowConfirm, countdown, setCountdown,
  clearing, handleClearDatabase, handleClearOrders, onLogout, loading
}) => {
  return (
    <header className="admin-header-wrapper">
      <div className="admin-header-main">
        <h1 style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo icon black.png" alt="I'm here" style={{ width: '50px', height: '50px', objectFit: 'contain', marginRight: '14px', borderRadius: '8px' }} />
          I'm here
        </h1>
        <p>Admin Cockpit — Generate customer IDs and design branded QR codes side-by-side</p>
      </div>

      <div className="admin-header-actions">
        {/* Tab switcher buttons */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
          <button
            type="button"
            onClick={() => setActiveAdminTab('generator')}
            style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeAdminTab === 'generator' ? 'rgba(99,102,241,0.25)' : 'transparent', color: activeAdminTab === 'generator' ? '#a5b4fc' : 'var(--text-secondary)', transition: 'all 0.2s' }}
          >
            QR Generator
          </button>
          <button
            type="button"
            onClick={() => setActiveAdminTab('orders')}
            style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeAdminTab === 'orders' ? 'rgba(99,102,241,0.25)' : 'transparent', color: activeAdminTab === 'orders' ? '#a5b4fc' : 'var(--text-secondary)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ShoppingBag size={13} /> Orders
            {orders.length > 0 && (
              <span style={{ background: 'var(--accent-rose)', color: 'white', fontSize: '0.65rem', fontWeight: 800, borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{orders.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveAdminTab('landing_qrs')}
            style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeAdminTab === 'landing_qrs' ? 'rgba(99,102,241,0.25)' : 'transparent', color: activeAdminTab === 'landing_qrs' ? '#a5b4fc' : 'var(--text-secondary)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🎨 Landing QRs
          </button>
          <button
            type="button"
            onClick={() => setActiveAdminTab('finder')}
            style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeAdminTab === 'finder' ? 'rgba(99,102,241,0.25)' : 'transparent', color: activeAdminTab === 'finder' ? '#a5b4fc' : 'var(--text-secondary)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔍 Scan Finder
          </button>
        </div>

        {/* New Button */}
        <button
          type="button"
          onClick={handleNew}
          className="btn"
          style={{ padding: '8px 14px', fontSize: '0.85rem', background: 'linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-purple) 100%)', border: 'none', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Reset Form / New Tag"
        >
          <Plus size={14} /> New
        </button>

        {/* Compact Clear DB Control */}
        {!showConfirm ? (
          <button
            type="button"
            className="btn btn-danger-outline"
            onClick={() => { setShowConfirm(true); setCountdown(3); }}
            disabled={loading || clearing}
            style={{ padding: '8px 14px', fontSize: '0.85rem', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--accent-rose)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Clear Database"
          >
            <Trash2 size={14} /> Clear DB
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-rose)' }}>Wipe DB?</span>
            <button
              type="button"
              className="btn-confirm-no"
              onClick={() => { setShowConfirm(false); setCountdown(0); }}
              disabled={clearing}
              style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              No
            </button>
            <button
              type="button"
              className="btn-confirm-yes"
              onClick={handleClearDatabase}
              disabled={clearing || countdown > 0}
              style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: 'var(--accent-rose)', color: 'white', fontWeight: 'bold', opacity: countdown > 0 ? 0.6 : 1, cursor: countdown > 0 ? 'not-allowed' : 'pointer' }}
            >
              {clearing ? '...' : countdown > 0 ? `${countdown}s` : 'Yes'}
            </button>
          </div>
        )}

        {/* Clear Orders Control */}
        <button
          type="button"
          className="btn btn-danger-outline"
          onClick={handleClearOrders}
          disabled={loading || clearing}
          style={{ padding: '8px 14px', fontSize: '0.85rem', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--accent-rose)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Clear Orders"
        >
          <Trash2 size={14} /> Clear Orders
        </button>

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          className="btn"
          style={{ padding: '8px 14px', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Logout Admin"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
