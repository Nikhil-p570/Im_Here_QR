import React from 'react';
import { Package, Zap, CheckCircle2, AlertTriangle, Phone, Mail, ChevronUp, ChevronDown, Truck, Download, Trash2 } from 'lucide-react';

const OrdersTab = ({
  orders, ordersLoading, ordersError, ordersSubTab, setOrdersSubTab,
  appendProgress, handleAppendAllToPdf,
  expandedOrders, setExpandedOrders,
  selectedToShipOrders, setSelectedToShipOrders, shipmentActionProgress,
  handleBulkBookShipments, handleBulkMarkAsPacked, handleBulkSchedulePickup,
  handleMarkSelectedShipped, handleMarkAllShipped,
  nimbusWallet, shippingRates, ratesLoading, fetchingWallet,
  handleBookShipment, handleCallNimbusApi, handleCancelShipment,
  appendedQrs, handleClearPdfSheet, frontPreviewOpen, setFrontPreviewOpen,
  backPreviewOpen, setBackPreviewOpen, handleDownloadPdf, handleDownloadLogoPdf,
  renderGuideOverlay, firestoreDb, doc, updateDoc
}) => {
  return (
    <div className="orders-tab-layout">
      {/* LEFT: Orders List */}
      <div className="orders-list-panel">
        <div className="orders-subtabs-nav" style={{ display: 'flex', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
          <button type="button" className={`orders-subtab-btn ${ordersSubTab === 'pending_qr' ? 'active' : ''}`} onClick={() => setOrdersSubTab('pending_qr')} style={{ background: 'transparent', border: 'none', color: ordersSubTab === 'pending_qr' ? 'var(--accent-indigo)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.88rem', padding: '6px 12px', cursor: 'pointer', borderBottom: ordersSubTab === 'pending_qr' ? '2.5px solid var(--accent-indigo)' : 'none', transition: 'all 0.2s' }}>
            📝 Pending QR ({orders.filter(o => o.orderStatus === 'orderplaced').length})
          </button>
          <button type="button" className={`orders-subtab-btn ${ordersSubTab === 'to_ship' ? 'active' : ''}`} onClick={() => setOrdersSubTab('to_ship')} style={{ background: 'transparent', border: 'none', color: ordersSubTab === 'to_ship' ? 'var(--accent-indigo)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.88rem', padding: '6px 12px', cursor: 'pointer', borderBottom: ordersSubTab === 'to_ship' ? '2.5px solid var(--accent-indigo)' : 'none', transition: 'all 0.2s' }}>
            🚚 Orders to Ship ({orders.filter(o => o.orderStatus === 'appended').length})
          </button>
          <button type="button" className={`orders-subtab-btn ${ordersSubTab === 'moved_to_shipment' ? 'active' : ''}`} onClick={() => setOrdersSubTab('moved_to_shipment')} style={{ background: 'transparent', border: 'none', color: ordersSubTab === 'moved_to_shipment' ? 'var(--accent-indigo)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.88rem', padding: '6px 12px', cursor: 'pointer', borderBottom: ordersSubTab === 'moved_to_shipment' ? '2.5px solid var(--accent-indigo)' : 'none', transition: 'all 0.2s' }}>
            🚀 Moved to Shipment ({orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).length})
          </button>
        </div>

        {ordersSubTab === 'pending_qr' ? (
          <>
            <div className="orders-panel-header">
              <div>
                <h2 className="orders-panel-title">📦 Pending Orders</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {orders.filter(o => o.orderStatus === 'orderplaced').length === 0 ? 'No new orders' : `${orders.filter(o => o.orderStatus === 'orderplaced').length} order${orders.filter(o => o.orderStatus === 'orderplaced').length > 1 ? 's' : ''} waiting to be processed`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <button
                  type="button" onClick={handleAppendAllToPdf}
                  disabled={orders.filter(o => o.orderStatus === 'orderplaced').length === 0 || appendProgress.active}
                  className="btn btn-primary"
                  style={{ padding: '9px 16px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px', opacity: (orders.filter(o => o.orderStatus === 'orderplaced').length === 0 || appendProgress.active) ? 0.5 : 1, cursor: (orders.filter(o => o.orderStatus === 'orderplaced').length === 0 || appendProgress.active) ? 'not-allowed' : 'pointer' }}
                >
                  {appendProgress.active ? <><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Processing...</> : <><Zap size={14} /> Append All to PDF</>}
                </button>
              </div>
            </div>

            {(appendProgress.active || appendProgress.message) && (
              <div className="append-progress-banner" style={{ marginBottom: '12px' }}>
                {appendProgress.active ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2.5px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#a5b4fc' }}>{appendProgress.message}</div>
                      {appendProgress.total > 0 && (
                        <div className="append-progress-bar-track">
                          <div className="append-progress-bar-fill" style={{ width: `${Math.round((appendProgress.done / appendProgress.total) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, flexShrink: 0 }}>{appendProgress.done}/{appendProgress.total}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#10b981' }}>{appendProgress.message}</span>
                  </>
                )}
              </div>
            )}

            {ordersError && <div className="status-msg status-msg-error" style={{ marginBottom: '12px' }}><AlertTriangle size={16} style={{ flexShrink: 0 }} /><span>{ordersError}</span></div>}

            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}><div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} /><p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading orders...</p></div>
            ) : orders.filter(o => o.orderStatus === 'orderplaced').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed var(--border-light)', borderRadius: '12px' }}>
                <Package size={48} style={{ opacity: 0.2, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>No pending orders</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: '4px' }}>New orders will appear here when customers place them.</p>
              </div>
            ) : (
              <div className="orders-cards-list">
                {orders.filter(o => o.orderStatus === 'orderplaced').map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-card-header" style={{ cursor: 'pointer' }} onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="order-card-name">{order.customerName || 'Unknown Customer'}</div>
                        <div className="order-card-meta">
                          <span><Phone size={11} /> {order.orderedPhoneNumber || '—'}</span>
                          <span><Mail size={11} /> {order.orderedEmail || '—'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span className={`order-badge ${order.paymentMode === 'cod' ? 'badge-cod' : 'badge-online'}`}>{order.paymentMode === 'cod' ? '💵 COD' : '💳 Online'}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>₹{order.totalAmount}</span>
                        </div>
                        <button type="button" className="btn-toggle-order" style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px' }}>
                          {expandedOrders[order.id] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </button>
                      </div>
                    </div>
                    {expandedOrders[order.id] && (
                      <>
                        <div className="order-card-items">
                          {(order.items || []).map((item, iIdx) => (
                            <div key={iIdx} className="order-item-row">
                              {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.typeofqr} className="order-item-thumb" /> : <div className="order-item-thumb-placeholder">{item.typeofqr === 'classic_black' ? '⬛' : item.typeofqr === 'classic_white' ? '⬜' : '🎨'}</div>}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="order-item-type">{item.typeofqr === 'personalised' ? '🎨 Personalised' : item.typeofqr === 'classic_black' ? '⬛ Classic Black' : '⬜ Classic White'}</div>
                                <div className="order-item-qty">Qty: <strong>{item.quantity}</strong> × ₹{item.unitPrice}</div>
                              </div>
                              <div className="order-item-total">₹{(item.quantity * item.unitPrice)}</div>
                            </div>
                          ))}
                        </div>
                        {order.shippingAddress && (
                          <div className="order-card-address">
                            📍 {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : ordersSubTab === 'to_ship' ? (
          <>
            <div className="orders-panel-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="orders-panel-title">🚚 Shipping Dashboard</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Process shipments, print labels, and schedule courier pickups via NimbusPost</p>
                </div>
              </div>
              <div className="bulk-actions-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-light)', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                  <input type="checkbox" id="select-all-to-ship" style={{ cursor: 'pointer', width: '15px', height: '15px' }} checked={orders.filter(o => o.orderStatus === 'appended').length > 0 && orders.filter(o => o.orderStatus === 'appended').every(o => !!selectedToShipOrders[o.id])} onChange={(e) => {
                    const checked = e.target.checked;
                    const toShipList = orders.filter(o => o.orderStatus === 'appended');
                    setSelectedToShipOrders(prev => {
                      const newSel = { ...prev };
                      toShipList.forEach(o => { newSel[o.id] = checked; });
                      return newSel;
                    });
                  }} />
                  <label htmlFor="select-all-to-ship" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>Select All ({orders.filter(o => o.orderStatus === 'appended').length})</label>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '8px' }}>Selected: {Object.values(selectedToShipOrders).filter(Boolean).length}</span>
                <button type="button" className="btn btn-primary" onClick={handleBulkBookShipments} disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active} style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}>🚀 Add Selected to NimbusPost</button>
                <button type="button" className="btn btn-primary" onClick={handleBulkMarkAsPacked} disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active} style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>📦 Mark as Packed</button>
                <button type="button" className="btn btn-primary" onClick={handleBulkSchedulePickup} disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active} style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>📅 Schedule Pickup</button>
              </div>
            </div>
            
            {(shipmentActionProgress.active || shipmentActionProgress.message) && (
              <div className="append-progress-banner" style={{ margin: '12px 0', background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' }}>
                {shipmentActionProgress.active ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2.5px', marginRight: '8px' }} /> : <CheckCircle2 size={16} style={{ color: '#10b981', marginRight: '8px' }} />}
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: shipmentActionProgress.active ? '#a5b4fc' : '#10b981' }}>{shipmentActionProgress.message}</span>
              </div>
            )}

            {ordersError && <div className="status-msg status-msg-error" style={{ margin: '12px 0' }}><AlertTriangle size={16} style={{ flexShrink: 0 }} /><span>{ordersError}</span></div>}

            <div className="nimbus-rates-dashboard glass-panel" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px' }}><Truck size={18} /> NimbusPost B2C Shipping Rates & Wallet</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Live Wallet Balance</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: nimbusWallet !== null && nimbusWallet < 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                    {fetchingWallet ? <span style={{ fontSize: '1.0rem', color: 'var(--text-secondary)' }}>Loading...</span> : nimbusWallet !== null ? `₹${nimbusWallet.toFixed(2)}` : '—'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending Shipping Cost</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>₹{Object.values(shippingRates).reduce((sum, r) => sum + r.charges, 0).toFixed(2)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Required Refill</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>₹{Math.max(0, Object.values(shippingRates).reduce((sum, r) => sum + r.charges, 0) - (nimbusWallet || 0)).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}><div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} /><p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading shipments...</p></div>
            ) : orders.filter(o => o.orderStatus === 'appended').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed var(--border-light)', borderRadius: '12px' }}><Package size={48} style={{ opacity: 0.2, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} /><p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>No orders to ship</p><p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: '4px' }}>Orders will appear here once their QR PDFs are generated.</p></div>
            ) : (
              <div className="orders-cards-list">
                {orders.filter(o => o.orderStatus === 'appended').map((order) => {
                  const isSelected = !!selectedToShipOrders[order.id];
                  return (
                    <div key={order.id} className={`order-card shipping-order-card status-${order.orderStatus}`} style={{ borderLeft: isSelected ? '4px solid var(--accent-indigo)' : '4px solid transparent' }}>
                      <div className="order-card-header" style={{ paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <input type="checkbox" checked={isSelected} onChange={(e) => setSelectedToShipOrders(prev => ({ ...prev, [order.id]: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                          <div>
                            <div className="order-card-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>{order.customerName || 'Unknown Customer'} <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>({order.id})</span></div>
                            <div className="order-card-meta"><span>📞 {order.orderedPhoneNumber || '—'}</span><span>✉️ {order.orderedEmail || '—'}</span></div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span className={`shipping-status-badge badge-${order.orderStatus}`}>📝 QR Ready</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{order.paymentMode === 'cod' ? '💵 COD' : '💳 Online'}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', padding: '12px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ marginBottom: '8px' }}><strong>📍 Shipping Address:</strong> {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - <strong>{order.shippingAddress?.pincode}</strong></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong>📦 Items ({order.items?.reduce((s, i) => s + (i.quantity || 1), 0)}):</strong>
                          {order.items?.map((item, idx) => (
                            <div key={idx} style={{ paddingLeft: '8px', color: 'var(--text-secondary)' }}>• {item.typeofqr === 'personalised' ? 'Personalised Tag' : 'Classic Tag'} × {item.quantity}</div>
                          ))}
                        </div>
                      </div>
                      {shippingRates[order.id] && (
                        <div style={{ fontSize: '0.8rem', padding: '10px 12px', background: 'rgba(245,158,11,0.04)', display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px dashed rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                          <div><strong>Calculated Courier:</strong> {shippingRates[order.id].name}</div>
                          <div><strong>Rate:</strong> ₹{shippingRates[order.id].charges.toFixed(2)}</div>
                        </div>
                      )}
                      <div className="order-card-actions" style={{ display: 'flex', padding: '12px', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-primary" onClick={() => handleBookShipment(order)} style={{ padding: '6px 12px', fontSize: '0.78rem' }}>🚀 Create Nimbus Shipment</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Moved to Shipment Tab */}
            <div className="orders-panel-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="orders-panel-title">🚀 Moved to Shipment</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Manage booked shipments, print labels, download manifests, or mark orders as shipped</p>
                </div>
              </div>
              <div className="bulk-actions-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-light)', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                  <input type="checkbox" id="select-all-shipments" style={{ cursor: 'pointer', width: '15px', height: '15px' }} checked={orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).length > 0 && orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).every(o => !!selectedToShipOrders[o.id])} onChange={(e) => {
                    const checked = e.target.checked;
                    const shipmentsList = orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus));
                    setSelectedToShipOrders(prev => {
                      const newSel = { ...prev };
                      shipmentsList.forEach(o => { newSel[o.id] = checked; });
                      return newSel;
                    });
                  }} />
                  <label htmlFor="select-all-shipments" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>Select All ({orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).length})</label>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '8px' }}>Selected: {Object.values(selectedToShipOrders).filter(Boolean).length}</span>
                <button type="button" className="btn btn-primary" onClick={handleMarkSelectedShipped} disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active} style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>🚚 Mark Selected as Shipped</button>
                <button type="button" className="btn btn-primary" onClick={handleMarkAllShipped} disabled={orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled'].includes(o.orderStatus)).length === 0 || shipmentActionProgress.active} style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' }}>🚚 Mark All as Shipped</button>
                <button type="button" className="btn btn-primary" onClick={handleBulkMarkAsPacked} disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active} style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }}>📦 Mark as Packed</button>
                <button type="button" className="btn btn-primary" onClick={handleBulkSchedulePickup} disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active} style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>📅 Schedule Pickup</button>
              </div>
            </div>

            {(shipmentActionProgress.active || shipmentActionProgress.message) && (
              <div className="append-progress-banner" style={{ margin: '12px 0', background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' }}>
                {shipmentActionProgress.active ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2.5px', marginRight: '8px' }} /> : <CheckCircle2 size={16} style={{ color: '#10b981', marginRight: '8px' }} />}
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: shipmentActionProgress.active ? '#a5b4fc' : '#10b981' }}>{shipmentActionProgress.message}</span>
              </div>
            )}
            
            {ordersError && <div className="status-msg status-msg-error" style={{ margin: '12px 0' }}><AlertTriangle size={16} style={{ flexShrink: 0 }} /><span>{ordersError}</span></div>}

            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}><div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} /><p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading shipments...</p></div>
            ) : orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed var(--border-light)', borderRadius: '12px' }}><Package size={48} style={{ opacity: 0.2, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} /><p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>No shipments booked yet</p><p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: '4px' }}>Once you book shipments from "Orders to Ship", they will appear here.</p></div>
            ) : (
              <div className="orders-cards-list">
                {orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).map((order) => {
                  const isSelected = !!selectedToShipOrders[order.id];
                  return (
                    <div key={order.id} className={`order-card shipping-order-card status-${order.orderStatus}`} style={{ borderLeft: isSelected ? '4px solid var(--accent-indigo)' : '4px solid transparent' }}>
                      <div className="order-card-header" style={{ paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <input type="checkbox" checked={isSelected} onChange={(e) => setSelectedToShipOrders(prev => ({ ...prev, [order.id]: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                          <div>
                            <div className="order-card-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>{order.customerName || 'Unknown Customer'} <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>({order.id})</span></div>
                            <div className="order-card-meta"><span>📞 {order.orderedPhoneNumber || '—'}</span><span>✉️ {order.orderedEmail || '—'}</span></div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span className={`shipping-status-badge badge-${order.orderStatus}`} style={{ background: order.orderStatus === 'shipped' ? 'rgba(16, 185, 129, 0.15)' : '', color: order.orderStatus === 'shipped' ? '#10b981' : '' }}>
                            {order.orderStatus === 'shipment_created' && '🚚 Shipment Booked'}
                            {order.orderStatus === 'label_printed' && '🖨️ Label Printed'}
                            {order.orderStatus === 'packed' && '📦 Packed'}
                            {order.orderStatus === 'pickup_scheduled' && '📅 Pickup Scheduled'}
                            {order.orderStatus === 'shipped' && '✨ Shipped'}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{order.paymentMode === 'cod' ? '💵 COD' : '💳 Online'}</span>
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '0.82rem', padding: '12px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ marginBottom: '8px' }}><strong>📍 Shipping Address:</strong> {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - <strong>{order.shippingAddress?.pincode}</strong></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong>📦 Items ({order.items?.reduce((s, i) => s + (i.quantity || 1), 0)}):</strong>
                          {order.items?.map((item, idx) => (
                            <div key={idx} style={{ paddingLeft: '8px', color: 'var(--text-secondary)' }}>• {item.typeofqr === 'personalised' ? 'Personalised Tag' : 'Classic Tag'} × {item.quantity}</div>
                          ))}
                        </div>
                      </div>

                      {order.awbNumber && (
                        <div style={{ fontSize: '0.8rem', padding: '10px 12px', background: 'rgba(99,102,241,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', borderTop: '1px dashed rgba(99,102,241,0.15)' }}>
                          <div><strong>AWB:</strong> {order.awbNumber}</div>
                          <div><strong>Courier:</strong> {order.courierPartner || 'NimbusPost'}</div>
                          {order.nimbuspostOrderId && <div><strong>Nimbus ID:</strong> {order.nimbuspostOrderId}</div>}
                        </div>
                      )}

                      <div className="order-card-actions" style={{ display: 'flex', padding: '12px', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
                        {order.shippingLabelUrl && (
                          <a href={order.shippingLabelUrl} target="_blank" rel="noreferrer" className="btn" onClick={async () => {
                            if (order.orderStatus === 'shipment_created' && firestoreDb) {
                              await updateDoc(doc(firestoreDb, 'orders', order.id), { orderStatus: 'label_printed' });
                            }
                          }} style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none', background: 'rgba(99,102,241,0.15)', border: '1px solid var(--accent-indigo)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Download size={11} /> Download Shipping Label
                          </a>
                        )}

                        {['shipment_created', 'label_printed'].includes(order.orderStatus) && (
                          <button type="button" className="btn" onClick={async () => {
                            if (firestoreDb) await updateDoc(doc(firestoreDb, 'orders', order.id), { orderStatus: 'packed' });
                          }} style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#10b981', border: 'none', color: '#ffffff' }}>✓ Mark Packed</button>
                        )}

                        {order.orderStatus === 'packed' && (
                          <button type="button" className="btn" onClick={async () => {
                            try {
                              const res = await handleCallNimbusApi('manifest', { awbNumbers: [order.awbNumber] });
                              if (firestoreDb) await updateDoc(doc(firestoreDb, 'orders', order.id), { orderStatus: 'pickup_scheduled', manifestUrl: res.manifestUrl });
                              if (res.manifestUrl) window.open(res.manifestUrl, '_blank');
                            } catch (err) { }
                          }} style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#f59e0b', border: 'none', color: '#ffffff' }}>📅 Schedule Pickup</button>
                        )}

                        {order.manifestUrl && (
                          <a href={order.manifestUrl} target="_blank" rel="noreferrer" className="btn" style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none', background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#ffffff' }}>📄 View Manifest</a>
                        )}

                        {['packed', 'pickup_scheduled'].includes(order.orderStatus) && (
                          <button type="button" className="btn" onClick={async () => {
                            if (firestoreDb) await updateDoc(doc(firestoreDb, 'orders', order.id), { orderStatus: 'shipped', shippedAt: new Date() });
                          }} style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#ffffff' }}>🚚 Mark Shipped</button>
                        )}

                        {['shipment_created', 'label_printed', 'packed'].includes(order.orderStatus) && (
                          <button type="button" className="btn btn-danger-outline" onClick={() => handleCancelShipment(order)} style={{ padding: '6px 12px', fontSize: '0.78rem' }}>Cancel Shipment</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* RIGHT: PDF Previews (collapsible accordions) */}
      <div className="orders-pdf-panel">
        <div className="glass-panel card-content" style={{ position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>📄 PDF Sheets Preview</h3>
            {appendedQrs.length > 0 && (
              <button type="button" onClick={handleClearPdfSheet} className="btn btn-danger-outline" style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trash2 size={10} /> Clear Sheet
              </button>
            )}
          </div>

          {appendedQrs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '0.85rem' }}>No QR codes yet.</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Press "Append All to PDF" to generate.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* ACCORDION 1: FRONT SIDE (QR CODES) */}
              <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
                <div onClick={() => setFrontPreviewOpen(!frontPreviewOpen)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', borderBottom: frontPreviewOpen ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {frontPreviewOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Front Side (QR Codes) <span style={{ opacity: 0.6, fontSize: '0.8rem', marginLeft: '4px', fontWeight: 500 }}>({appendedQrs.length} QRs)</span>
                    </span>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDownloadPdf(); }} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Download size={10} /> Front PDF
                  </button>
                </div>

                {frontPreviewOpen && (
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    {(() => {
                      const pages = [];
                      for (let i = 0; i < appendedQrs.length; i += 12) pages.push(appendedQrs.slice(i, i + 12));
                      return pages.map((pageItems, pageIdx) => (
                        <div key={pageIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Page {pageIdx + 1} of {pages.length}</span>
                          <div className="pdf-preview-page">
                            {Array.from({ length: 12 }).map((_, slotIdx) => {
                              const hasItem = slotIdx < pageItems.length;
                              if (hasItem) {
                                const slotEntry = pageItems[slotIdx];
                                const slotQrUrl = slotEntry?.qrUrl ?? slotEntry;
                                return (
                                  <div key={slotIdx} className="pdf-preview-item" style={{ background: '#fafafa' }}>
                                    {slotEntry?.typeofqr === 'personalised' && <img src={slotEntry.version === 2 ? '/logo icon black.png' : slotEntry.imageUrl} alt="bg" className="pdf-preview-image" style={{ objectFit: slotEntry.version === 2 ? 'contain' : 'cover', background: '#000000' }} />}
                                    {slotEntry?.typeofqr === 'classic_black' && <div className="pdf-preview-image" style={{ background: '#000000' }} />}
                                    {slotEntry?.typeofqr === 'classic_white' && <div className="pdf-preview-image" style={{ background: '#ffffff' }} />}
                                    <img src={slotQrUrl} alt={`QR ${slotIdx}`} className="pdf-preview-image" style={{ zIndex: 2 }} />
                                    {renderGuideOverlay(pageIdx, slotIdx)}
                                  </div>
                                );
                              } else {
                                return <div key={slotIdx} className="pdf-preview-item-empty" style={{ position: 'relative' }}>{renderGuideOverlay(pageIdx, slotIdx)}</div>;
                              }
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* ACCORDION 2: BACK SIDE (COVERS/LOGOS) */}
              <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
                <div onClick={() => setBackPreviewOpen(!backPreviewOpen)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', borderBottom: backPreviewOpen ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {backPreviewOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Back Side (Covers/Logos) <span style={{ opacity: 0.6, fontSize: '0.8rem', marginLeft: '4px', fontWeight: 500 }}>({appendedQrs.length} QRs)</span>
                    </span>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDownloadLogoPdf(); }} className="btn btn-success" style={{ padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#ffffff' }}>
                    <Download size={10} /> Back PDF
                  </button>
                </div>

                {backPreviewOpen && (
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    {(() => {
                      const pages = [];
                      for (let i = 0; i < appendedQrs.length; i += 12) pages.push(appendedQrs.slice(i, i + 12));
                      return pages.map((pageItems, pageIdx) => (
                        <div key={pageIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Page {pageIdx + 1} of {pages.length}</span>
                          <div className="pdf-preview-page">
                            {Array.from({ length: 12 }).map((_, slotIdx) => {
                              const hasItem = slotIdx < pageItems.length;
                              if (hasItem) {
                                const slotEntry = pageItems[slotIdx];
                                let backImgSrc = '/full logo black.png';
                                if (slotEntry?.typeofqr === 'personalised' && slotEntry?.version === 2) {
                                  backImgSrc = slotEntry?.imageUrl || '';
                                }
                                return (
                                  <div key={slotIdx} className="pdf-preview-item" style={{ background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {backImgSrc ? <img src={backImgSrc} alt={`Back ${slotIdx}`} className="pdf-preview-image" style={{ objectFit: 'contain', background: '#000000' }} /> : <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#ef4444' }}>No Image</span>}
                                    {renderGuideOverlay(pageIdx, slotIdx)}
                                  </div>
                                );
                              } else {
                                return <div key={slotIdx} className="pdf-preview-item-empty" style={{ position: 'relative' }}>{renderGuideOverlay(pageIdx, slotIdx)}</div>;
                              }
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersTab;
