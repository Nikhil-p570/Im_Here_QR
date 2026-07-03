import React from 'react';
import {
  Globe, Sparkles, Copy, Check, Trash2, AlertTriangle, CheckCircle2,
  Image as ImageIcon, Download, Plus, ChevronDown, ChevronUp
} from 'lucide-react';

const PRESETS = [
  { name: 'Black on White', dot: '#000000', bg: '#ffffff' },
  { name: 'White on Black', dot: '#ffffff', bg: '#000000' },
  { name: 'Red on White', dot: '#e8402c', bg: '#ffffff' },
  { name: 'Navy on Cream', dot: '#1b2a4a', bg: '#f4f1ea' },
];

const QRGeneratorTab = ({
  // Customer ID Gen
  predefinedDomain, handleGenerateId, loading, clearing, error, result, copied, handleCopyLink,
  // QR Config
  qrUrl, setQrUrl, handleImageUpload, uploadedImg, setUploadedImg, cropState, setCropState,
  cropCanvasRef, handleCropBoxDown, handleCropBoxMove, handleCropBoxUp, dragging,
  handleCropSizeChange, logoScale, setLogoScale,
  dotColor, setDotColor, bgColor, setBgColor, bgMode, setBgMode, setShowLogoChip,
  selectedVersion, setSelectedVersion, overlayDarkness, setOverlayDarkness,
  showLogoChip, dotSize, setDotSize, dotShape, setDotShape, cornerShape, setCornerShape,
  hasFrame, setHasFrame, frameText, setFrameText, frameBgColor, setFrameBgColor,
  frameTextColor, setFrameTextColor, qrNoteText, qrNoteClass, handlePresetSelect,
  // Prices
  handleSavePrices, personalisedOriginal, setPersonalisedOriginal, personalisedDiscounted, setPersonalisedDiscounted,
  classicOriginal, setClassicOriginal, classicDiscounted, setClassicDiscounted, savingPrices, pricingSuccess, pricingError,
  // Previews & Outputs
  qrImageUrl, flipPreview, setFlipPreview, getBacksidePreviewUrl, hasBeenGeneratedOnce,
  handleAppendToPdf, appendedQrs, handleRemoveLastQr, handleDownload, downloadError, qrCanvasRef
}) => {
  return (
    <div className="dashboard-grid">
      {/* Left Column: Configuration Forms */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Card 1: ID Generator Input */}
        <main className="glass-panel card-content">
          <h2 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '8px' }}>
            1. Customer ID Generation
          </h2>
          <form onSubmit={handleGenerateId} className="form-group">
            <label htmlFor="domainInput" className="form-label" style={{ fontSize: '0.75rem' }}>
              Predefined Host Domain
            </label>
            <div className="input-wrapper">
              <Globe className="input-icon" size={20} />
              <input
                id="domainInput"
                type="text"
                className="text-input"
                value={predefinedDomain + "/"}
                disabled={true}
                style={{ opacity: 0.8, cursor: 'not-allowed' }}
              />
            </div>

            {error && (
              <div className="status-msg status-msg-error">
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || clearing}
            >
              {loading ? (
                <><div className="spinner"></div> Checking DB & Generating...</>
              ) : (
                <><Sparkles size={20} /> Generate Customer Link</>
              )}
            </button>
          </form>
        </main>

        {/* Card 2: QR Designer Inputs */}
        <section className="glass-panel card-content">
          <h2 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '8px' }}>
            2. Branded QR Code Design
          </h2>

          <div className="form-group">
            <label htmlFor="qrUrlInput" className="form-label" style={{ fontSize: '0.75rem' }}>QR Destination URL</label>
            <div className="input-wrapper">
              <Globe className="input-icon" size={20} />
              <input
                id="qrUrlInput"
                type="text"
                className="text-input"
                placeholder="Generate ID first or type manually..."
                value={qrUrl}
                onChange={(e) => setQrUrl(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Logo / Center graphic (Optional)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="file" id="qrImageInput" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              <button
                type="button"
                className="btn btn-danger-outline"
                style={{ flex: 1, borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => document.getElementById('qrImageInput').click()}
              >
                <ImageIcon size={18} /> {uploadedImg ? "Change Logo Image" : "Upload Logo Image"}
              </button>

              {uploadedImg && (
                <button
                  type="button"
                  className="btn btn-danger-outline"
                  title="Remove uploaded image"
                  style={{ padding: '10px 14px', borderStyle: 'solid', flexShrink: 0 }}
                  onClick={() => {
                    setUploadedImg(null);
                    setCropState({ x: 0, y: 0, size: 120, dispW: 0, dispH: 0, scale: 1, showCropStep: false });
                    document.getElementById('qrImageInput').value = '';
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {cropState.showCropStep && (
              <div className="confirmation-box" style={{ margin: '10px 0', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.15)' }}>
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
                <p className="hint" style={{ textAlign: 'center', fontSize: '0.75rem' }}>Drag the dashed square to select the logo.</p>
                
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Selection crop size:</span><span style={{ color: 'var(--accent-cyan)' }}>{cropState.size}px</span>
                  </label>
                  <input type="range" min="30" max={Math.min(cropState.dispW, cropState.dispH)} value={cropState.size} onChange={handleCropSizeChange} style={{ width: '100%', accentColor: '#e8402c' }} />
                </div>
                
                <div className="form-group" style={{ marginTop: '6px' }}>
                  <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Logo scale on QR:</span><span style={{ color: 'var(--accent-cyan)' }}>{logoScale}%</span>
                  </label>
                  <input type="range" min="14" max="30" value={logoScale} onChange={(e) => setLogoScale(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#e8402c' }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div className="color-field">
                <input type="color" value={dotColor} onChange={(e) => setDotColor(e.target.value)} className="color-picker-input" />
                <label className="color-picker-label">Dot Color</label>
              </div>
              <div className="color-field">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="color-picker-input" />
                <label className="color-picker-label">Background</label>
              </div>
            </div>

            <div className="presets">
              {PRESETS.map((preset, idx) => (
                <button key={idx} type="button" onClick={() => handlePresetSelect(preset)} className="preset-btn" style={{ borderColor: preset.dot, background: preset.bg, color: preset.dot }} title={preset.name}>Aa</button>
              ))}
            </div>

            <div className="form-group" style={{ marginTop: '6px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Background Mode</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => { setBgMode("solid"); setShowLogoChip(true); }} className={`mode-btn ${bgMode === 'solid' ? 'active' : ''}`}>Solid Color</button>
                <button type="button" onClick={() => { setBgMode("image"); setShowLogoChip(false); }} className={`mode-btn ${bgMode === 'image' ? 'active' : ''}`}>Full Image</button>
              </div>
              {!uploadedImg && bgMode === 'image' && <p className="hint" style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>Upload an image to enable Full Image background</p>}
            </div>

            {bgMode === 'image' && uploadedImg && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Select Tag Style Version</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button type="button" onClick={() => setSelectedVersion(1)} className={`mode-btn ${selectedVersion === 1 ? 'active' : ''}`} style={{ flex: 1, padding: '10px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontWeight: 700 }}>Photo-Front (V1)</span><span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Front: Photo | Back: Logo</span>
                    </button>
                    <button type="button" onClick={() => setSelectedVersion(2)} className={`mode-btn ${selectedVersion === 2 ? 'active' : ''}`} style={{ flex: 1, padding: '10px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontWeight: 700 }}>Photo-Back (V2)</span><span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Front: Logo | Back: Photo</span>
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Image overlay darkness:</span><span style={{ color: 'var(--accent-cyan)' }}>{overlayDarkness}%</span>
                  </label>
                  <input type="range" min="0" max="80" value={overlayDarkness} onChange={(e) => setOverlayDarkness(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#e8402c' }} />
                </div>
              </div>
            )}

            {bgMode !== 'image' && (
              <div className="checkbox-row" style={{ marginTop: '4px' }}>
                <input type="checkbox" id="reactLogoChipToggle" checked={showLogoChip} onChange={(e) => setShowLogoChip(e.target.checked)} />
                <label htmlFor="reactLogoChipToggle" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Show logo chip in center</label>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Dot Size:</span><span style={{ color: 'var(--accent-cyan)' }}>{dotSize}%</span>
              </label>
              <input type="range" min="35" max="100" value={dotSize} onChange={(e) => setDotSize(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#e8402c' }} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Dot Shape</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['square', 'rounded', 'circle'].map(shape => (
                  <button key={shape} type="button" onClick={() => setDotShape(shape)} className={`shape-btn ${dotShape === shape ? 'active' : ''}`}>{shape === 'square' ? '■ Square' : shape === 'rounded' ? '▢ Rounded' : '● Circle'}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Corner (Eye) Style</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['square', 'rounded', 'circle'].map(shape => (
                  <button key={shape} type="button" onClick={() => setCornerShape(shape)} className={`corner-btn ${cornerShape === shape ? 'active' : ''}`}>{shape === 'square' ? '■ Square' : shape === 'rounded' ? '▢ Rounded' : '● Circle'}</button>
                ))}
              </div>
            </div>

            <div className="checkbox-row" style={{ marginTop: '4px' }}>
              <input type="checkbox" id="reactFrameToggle" checked={hasFrame} onChange={(e) => setHasFrame(e.target.checked)} />
              <label htmlFor="reactFrameToggle" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Add frame text below</label>
            </div>

            {hasFrame && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                <div className="form-group">
                  <label htmlFor="reactFrameText" className="form-label" style={{ fontSize: '0.75rem' }}>Banner text</label>
                  <input type="text" id="reactFrameText" className="text-input" value={frameText} onChange={(e) => setFrameText(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div className="color-field">
                    <input type="color" value={frameBgColor} onChange={(e) => setFrameBgColor(e.target.value)} className="color-picker-input" />
                    <label className="color-picker-label">Frame Bg</label>
                  </div>
                  <div className="color-field">
                    <input type="color" value={frameTextColor} onChange={(e) => setFrameTextColor(e.target.value)} className="color-picker-input" />
                    <label className="color-picker-label">Frame Text</label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {qrNoteText && (
            <div className={`status-msg ${qrNoteClass.includes('warn') ? 'status-msg-error' : 'status-msg-success'}`} style={{ fontSize: '0.8rem', marginTop: '12px' }}>
              {qrNoteClass.includes('warn') ? <AlertTriangle size={16} /> : <Check size={16} />} <span>{qrNoteText}</span>
            </div>
          )}
        </section>

        {/* Card 3: Price Settings */}
        <section className="glass-panel card-content">
          <h2 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '12px' }}>
            3. Smart Keychain Pricing
          </h2>
          <form onSubmit={handleSavePrices} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Personalised Tag Prices</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.7rem' }}>Original (₹)</label>
                  <input type="number" className="text-input" required value={personalisedOriginal} onChange={(e) => setPersonalisedOriginal(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.7rem' }}>Discounted (₹)</label>
                  <input type="number" className="text-input" required value={personalisedDiscounted} onChange={(e) => setPersonalisedDiscounted(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Classic Tag Prices</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.7rem' }}>Original (₹)</label>
                  <input type="number" className="text-input" required value={classicOriginal} onChange={(e) => setClassicOriginal(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.7rem' }}>Discounted (₹)</label>
                  <input type="number" className="text-input" required value={classicDiscounted} onChange={(e) => setClassicDiscounted(e.target.value)} />
                </div>
              </div>
            </div>

            {pricingSuccess && <div className="status-msg status-msg-success" style={{ margin: 0, fontSize: '0.8rem' }}><CheckCircle2 size={16} /><span>{pricingSuccess}</span></div>}
            {pricingError && <div className="status-msg status-msg-error" style={{ margin: 0, fontSize: '0.8rem' }}><AlertTriangle size={16} /><span>{pricingError}</span></div>}
            
            <button type="submit" className="btn btn-primary" disabled={savingPrices} style={{ width: '100%', marginTop: '4px' }}>
              {savingPrices ? "Saving..." : "Save Prices to Firestore"}
            </button>
          </form>
        </section>
      </div>

      {/* Right Column: Previews & Results */}
      <div className="sticky-column">
        {/* Card 1: Generated ID URL Link output */}
        <div className="glass-panel card-content">
          <h2 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '8px' }}>
            Generated Link Output
          </h2>
          {result ? (
            <div className="result-container" style={{ margin: 0 }}>
              <div className="result-header">
                <span className="result-title">Customer Link</span>
                <span className="history-url" style={{ opacity: 0.6 }}>ID: {result.id}</span>
              </div>
              <div className="output-link-box">
                <div className="output-link-text">{result.url}</div>
                <button onClick={handleCopyLink} className="btn-copy" title="Copy Link">
                  {copied ? <Check size={18} style={{ color: '#10b981' }} /> : <Copy size={18} />}
                </button>
              </div>
              {result.isSavedToDb ? (
                <p className="hint" style={{ color: 'var(--accent-emerald)', marginTop: '4px' }}>✓ ID stored in Firestore and loaded into the QR input.</p>
              ) : (
                <p className="hint" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>ID ready. Will be saved to Firestore when you Copy Link or Download PNG.</p>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
              <Globe size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontSize: '0.9rem' }}>No customer link generated yet.</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Click "Generate Customer Link" on the left.</p>
            </div>
          )}
        </div>

        {/* Card 2: Generated QR Code Image result */}
        <div className="glass-panel card-content">
          <h2 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '8px' }}>
            QR Code Preview
          </h2>
          {qrImageUrl ? (
            <div style={{ textAlign: 'center' }}>
              <img
                src={flipPreview ? getBacksidePreviewUrl() : qrImageUrl}
                alt={flipPreview ? "Backside Preview" : "Resulting QR Code"}
                style={{ width: '100%', maxWidth: '380px', aspectRatio: hasFrame ? '640/700' : '1/1', objectFit: flipPreview ? 'contain' : 'cover', background: flipPreview ? '#000000' : 'transparent', borderRadius: '10px', display: 'block', margin: '12px auto', border: '1px solid var(--border-light)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
              />

              <button type="button" className="btn" onClick={() => setFlipPreview(prev => !prev)} style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', padding: '12px 16px', marginBottom: '8px' }}>
                🔄 Flip Tag ({flipPreview ? 'See Front' : 'See Back'})
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button type="button" onClick={handleAppendToPdf} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Plus size={18} /> APPEND TO PDF SHEET
                </button>

                {appendedQrs.length > 0 && appendedQrs[appendedQrs.length - 1]?.isManual && (
                  <button type="button" onClick={handleRemoveLastQr} className="btn btn-danger-outline" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderColor: 'rgba(244, 63, 94, 0.4)', color: 'var(--accent-rose)', fontSize: '0.85rem', padding: '12px 16px', marginTop: '2px', marginBottom: '2px' }}>
                    ↩️ UNDO LAST APPEND
                  </button>
                )}

                <button type="button" onClick={handleDownload} className="btn" style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', padding: '12px 16px' }}>
                  <Download size={16} /> DOWNLOAD SINGLE PNG
                </button>
              </div>

              {downloadError && <p className="hint" style={{ color: 'var(--accent-rose)', marginTop: '8px' }}>{downloadError}</p>}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
              <ImageIcon size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontSize: '0.9rem' }}>No QR Code generated yet.</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Click "GENERATE QR CODE" on the left.</p>
            </div>
          )}
        </div>

        {/* Hidden Canvas used for generating the QR code */}
        <canvas ref={qrCanvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default QRGeneratorTab;
