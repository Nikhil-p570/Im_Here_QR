import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

const LandingQRsTab = ({
  landingQrs, setLandingQrs, handleLandingImageUpload, croppingLandingTag,
  cropState, handleCropBoxDown, handleCropBoxMove, handleCropBoxUp, dragging,
  handleCropSizeChange, handleApplyLandingCrop, setCroppingLandingTag,
  setLandingCropImage, setCropState, landingPreviewCanvasRef,
  handleSaveLandingQrs, savingLandingQrs, landingSuccess, landingError, cropCanvasRef
}) => {
  return (
    <div className="glass-panel card-content" style={{ marginTop: '12px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-indigo) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '20px' }}>
        🎨 Landing Page Keychains Configuration
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
        Configure the three hanging keychains that are displayed on the landing page of the website.
        For each keychain, upload a background logo/picture, and enter a label. When saved, these will immediately update the homepage.
        Scanning these keychains or clicking them redirects users to the demo profile page (id=preview).
      </p>

      <form onSubmit={handleSaveLandingQrs} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

          {[
            { id: 'tag1', title: 'Left Tag (Tag 1)', placeholder: 'e.g. Your Pet' },
            { id: 'tag2', title: 'Center Tag (Tag 2)', placeholder: 'e.g. Your Memory' },
            { id: 'tag3', title: 'Right Tag (Tag 3)', placeholder: 'e.g. Your Art' },
          ].map(tag => (
            <div key={tag.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>{tag.title}</h3>
                <button
                  type="button"
                  onClick={() => setLandingQrs(prev => ({ ...prev, [tag.id]: { ...prev[tag.id], visible: !prev[tag.id].visible } }))}
                  style={{ background: 'transparent', border: 'none', color: landingQrs[tag.id].visible ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', transition: 'all 0.2s' }}
                  title={landingQrs[tag.id].visible ? "Visible on landing page" : "Hidden on landing page"}
                >
                  {landingQrs[tag.id].visible ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Tag Label</label>
                <input
                  type="text"
                  className="text-input"
                  value={landingQrs[tag.id].label}
                  onChange={(e) => setLandingQrs(prev => ({ ...prev, [tag.id]: { ...prev[tag.id], label: e.target.value } }))}
                  placeholder={tag.placeholder}
                  required
                />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Background Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', background: '#0a0a0a', border: '1px solid var(--border-light)', flexShrink: 0 }}>
                    <img
                      src={landingQrs[tag.id].base64Image || `/cropped_${tag.id}.png`}
                      onError={(e) => {
                        if (e.target.src.endsWith(`/cropped_${tag.id}.png`)) e.target.src = `/cropped_${tag.id}.jpg`;
                        else if (e.target.src.endsWith(`/cropped_${tag.id}.jpg`)) e.target.src = '/logo icon black.png';
                        else { e.target.onerror = null; e.target.src = ''; }
                      }}
                      alt={tag.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <input type="file" id={`landing-${tag.id}-file`} accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLandingImageUpload(tag.id, e.target.files[0])} />
                  <button type="button" className="btn btn-danger-outline" style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }} onClick={() => document.getElementById(`landing-${tag.id}-file`).click()}>
                    Upload Image
                  </button>
                </div>
              </div>

              {croppingLandingTag === tag.id && cropState.showCropStep && (
                <div className="confirmation-box" style={{ margin: '10px 0', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>Adjust Crop Area</h4>
                  <div style={{ position: 'relative', margin: '10px auto', borderRadius: '8px', overflow: 'hidden', width: `${cropState.dispW}px`, height: `${cropState.dispH}px`, touchAction: 'none' }}>
                    <canvas ref={cropCanvasRef} style={{ display: 'block' }} />
                    <div
                      onPointerDown={handleCropBoxDown} onPointerMove={handleCropBoxMove} onPointerUp={handleCropBoxUp} onPointerCancel={handleCropBoxUp}
                      style={{ position: 'absolute', border: '2px solid rgba(255, 255, 255, 0.9)', boxShadow: '0 0 4px rgba(0,0,0,0.8)', background: 'rgba(255, 255, 255, 0.05)', cursor: dragging ? 'grabbing' : 'grab', borderRadius: '2px', width: `${cropState.size}px`, height: `${cropState.size}px`, left: `${cropState.x}px`, top: `${cropState.y}px` }}
                    >
                      <div className="crop-box-overlay">
                        <div className="crop-grid-line-v v1" /><div className="crop-grid-line-v v2" /><div className="crop-grid-line-h h1" /><div className="crop-grid-line-h h2" />
                        <div className="crop-edge-bar bar-top" /><div className="crop-edge-bar bar-bottom" /><div className="crop-edge-bar bar-left" /><div className="crop-edge-bar bar-right" />
                        <div className="crop-corner-bracket corner-tl" /><div className="crop-corner-bracket corner-tr" /><div className="crop-corner-bracket corner-bl" /><div className="crop-corner-bracket corner-br" />
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '10px' }}>
                    <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Selection crop size:</span><span style={{ color: 'var(--accent-cyan)' }}>{cropState.size}px</span>
                    </label>
                    <input type="range" min="30" max={Math.min(cropState.dispW, cropState.dispH)} value={cropState.size} onChange={handleCropSizeChange} style={{ width: '100%', accentColor: '#e8402c' }} />
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }} onClick={() => handleApplyLandingCrop(tag.id)}>Apply Crop</button>
                    <button type="button" className="btn btn-danger-outline" style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }} onClick={() => { setCroppingLandingTag(null); setLandingCropImage(null); setCropState(prev => ({ ...prev, showCropStep: false })); }}>Cancel</button>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Live Tag Preview:</span>
                    <canvas ref={landingPreviewCanvasRef} style={{ display: 'block', width: '160px', height: '175px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#000' }} />
                  </div>
                </div>
              )}
            </div>
          ))}

        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
          <div>
            {landingSuccess && <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 600 }}>✓ {landingSuccess}</span>}
            {landingError && <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>⚠ {landingError}</span>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingLandingQrs} style={{ padding: '12px 30px', fontSize: '0.95rem', fontWeight: 700, borderRadius: '10px' }}>
            {savingLandingQrs ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LandingQRsTab;
