import { useState, useEffect } from 'react';
import './CustomerRegistration.css';
import { doc, setDoc } from 'firebase/firestore';
import { AlertTriangle, User, Phone, Lock, Plus, Trash2, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { COUNTRY_CODES } from './CustomerRegistration';

const CustomerEditProfile = ({
  firestoreDb,
  customerId,
  customerData,
  onSuccess,
  onCancel
}) => {
  const [editName, setEditName] = useState(customerData.name || "");
  const [editNumber, setEditNumber] = useState(customerData.localNumber || "");
  const [editPassword, setEditPassword] = useState(sessionStorage.getItem(`owner_session_pass_${customerId}`) || "");
  const [showPassword, setShowPassword] = useState(false);

  const presetQuestions = [
    "What is the name of your first pet?",
    "What is your secret name?",
    "In what city were you born?",
    "What was the name of your first school?"
  ];

  const currentQuestion = customerData.securityQuestion || "";
  const getInitialQuestionType = () => {
    if (presetQuestions.includes(currentQuestion)) {
      return currentQuestion;
    } else if (currentQuestion) {
      return "custom";
    } else {
      return "What is the name of your first pet?";
    }
  };

  const [editSecurityQuestionType, setEditSecurityQuestionType] = useState(getInitialQuestionType());
  const [editCustomSecurityQuestion, setEditCustomSecurityQuestion] = useState(
    presetQuestions.includes(currentQuestion) ? "" : currentQuestion
  );
  const [editSecurityAnswer, setEditSecurityAnswer] = useState(sessionStorage.getItem(`owner_session_bypass_${customerId}`) || "");
  const [editSocials, setEditSocials] = useState(customerData.socials || []);

  const getInitialCountry = () => {
    return COUNTRY_CODES.find(c => c.code === customerData.countryCode) || COUNTRY_CODES[0];
  };
  const [editSelectedCountry, setEditSelectedCountry] = useState(getInitialCountry());
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [openDropdownIdx, setOpenDropdownIdx] = useState(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdownIdx(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleEditSocialFieldChange = (idx, field, val) => {
    setEditSocials(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    setEditSaving(true);

    const nameVal = editName.trim();
    const numberVal = editNumber.replace(/\D/g, ''); // digits only
    const passwordVal = editPassword.trim();
    const questionTypeVal = editSecurityQuestionType;
    const customQuestionVal = editCustomSecurityQuestion.trim();
    const answerVal = editSecurityAnswer.trim();

    // Validations
    if (!numberVal) {
      setEditError("Contact phone number is required.");
      setEditSaving(false);
      return;
    }
    const isIndia = editSelectedCountry.code === '91';
    if (isIndia && numberVal.length !== 10) {
      setEditError("Indian phone numbers must be exactly 10 digits.");
      setEditSaving(false);
      return;
    }
    if (numberVal.length < 7 || numberVal.length > 15) {
      setEditError("Phone number must be between 7 and 15 digits.");
      setEditSaving(false);
      return;
    }
    if (!passwordVal) {
      setEditError("Please specify a tag password so you can update details later.");
      setEditSaving(false);
      return;
    }
    if (questionTypeVal === 'custom' && !customQuestionVal) {
      setEditError("Please enter your custom security question.");
      setEditSaving(false);
      return;
    }
    if (!answerVal) {
      setEditError("Please specify a security answer to prove your identity.");
      setEditSaving(false);
      return;
    }

    // Social fields validation
    const cleanedSocials = [];
    for (const social of editSocials) {
      const type = social.type;
      let val = social.value.trim();
      let lbl = social.label.trim();

      if (!val) continue;

      if (type === 'Email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          setEditError(`Please enter a valid email address: "${val}"`);
          setEditSaving(false);
          return;
        }
        lbl = 'Email';
      } else {
        if (type !== 'Custom Link' && !lbl) {
          lbl = type;
        }
        if (type === 'Custom Link' && !lbl) {
          setEditError("Please enter a title for your custom link.");
          setEditSaving(false);
          return;
        }
        if (val.includes('.') && !/^https?:\/\//i.test(val)) {
          val = `https://${val}`;
        }
      }
      cleanedSocials.push({ type, label: lbl, value: val });
    }

    const combinedNumber = `${editSelectedCountry.code}${numberVal}`;

    try {
      if (!customerId) throw new Error("No customer ID found in URL.");
      
      const savedPass = sessionStorage.getItem(`owner_session_pass_${customerId}`) || '';
      const savedBypass = sessionStorage.getItem(`owner_session_bypass_${customerId}`) || '';

      const updatePayload = {
        action: 'update',
        id: customerId,
        verificationPassword: savedPass,
        verificationSecurityAnswer: savedBypass,
        name: nameVal,
        number: combinedNumber,
        altNumber: customerData.altNumber || '',
        whatsappEnabled: customerData.whatsappEnabled !== false,
        message: customerData.message || 'Hi! If you found my item, please get in touch.',
        rewardEnabled: !!customerData.rewardEnabled,
        rewardAmount: customerData.rewardAmount || '',
        socials: cleanedSocials,
        ...(passwordVal ? { newPassword: passwordVal } : {}),
        newSecurityQuestion: questionTypeVal === 'custom' ? customQuestionVal : questionTypeVal,
        ...(answerVal ? { newSecurityAnswer: answerVal } : {})
      };

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (passwordVal) {
          sessionStorage.setItem(`owner_session_pass_${customerId}`, passwordVal);
        }
        setEditSuccess("Profile updated successfully! 🎉");
        setTimeout(() => {
          onSuccess(data.profile);
          setEditSuccess("");
        }, 1000);
      } else {
        setEditError(data.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setEditError(`Failed to update details: ${err.message}`);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '520px', alignSelf: 'center' }}>
      <main className="glass-panel card-content" style={{ padding: '36px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/full logo.png" alt="I'm here" style={{ width: '160px', height: 'auto', borderRadius: '12px', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-indigo) 70%, var(--accent-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Update Tag Information
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', lineHeight: '1.5' }}>
            Modify your details below. Anyone scanning your physical tag will see these updated details.
          </p>
        </div>

        <form onSubmit={handleSaveChanges} className="form-group" style={{ gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="editNameInput" className="form-label" style={{ fontSize: '0.72rem' }}>Name (Optional)</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input
                id="editNameInput"
                type="text"
                className="text-input"
                placeholder="e.g. Nikhil P."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={editSaving}
                style={{ padding: '12px 14px 12px 42px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="editNumberInput" className="form-label" style={{ fontSize: '0.72rem' }}>Phone Number (Required)</label>
            <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
              <div style={{ position: 'relative', width: '130px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowCountryDropdown(!showCountryDropdown); }}
                  disabled={editSaving}
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '12px 10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  <span>{editSelectedCountry.flag} +{editSelectedCountry.code}</span>
                  <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>▼</span>
                </button>

                {showCountryDropdown && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      width: '240px',
                      marginTop: '6px',
                      background: '#0f172a',
                      border: '1px solid var(--border-light)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      overflow: 'hidden',
                      padding: '8px'
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Search country..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        marginBottom: '8px',
                        outline: 'none'
                      }}
                    />
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      {COUNTRY_CODES.filter(c => 
                        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
                        c.code.includes(countrySearch)
                      ).map(c => (
                        <div
                          key={c.name}
                          onClick={() => {
                            setEditSelectedCountry(c);
                            setShowCountryDropdown(false);
                            setCountrySearch("");
                          }}
                          style={{
                            padding: '8px 10px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: editSelectedCountry.code === c.code ? 'var(--accent-cyan)' : 'var(--text-primary)',
                            background: editSelectedCountry.code === c.code ? 'rgba(255,255,255,0.04)' : 'transparent'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={(e) => e.target.style.background = editSelectedCountry.code === c.code ? 'rgba(255,255,255,0.04)' : 'transparent'}
                        >
                          <span>{c.flag} {c.name}</span>
                          <span style={{ opacity: 0.6 }}>+{c.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="input-wrapper" style={{ flex: 1 }}>
                <Phone className="input-icon" size={18} />
                <input
                  id="editNumberInput"
                  type="tel"
                  className="text-input"
                  placeholder={editSelectedCountry.code === '91' ? "10-digit mobile number" : "Mobile number"}
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  disabled={editSaving}
                  style={{ padding: '12px 14px 12px 42px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="editPasswordInput" className="form-label" style={{ fontSize: '0.72rem' }}>Password (Required)</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="editPasswordInput"
                type={showPassword ? "text" : "password"}
                className="text-input"
                placeholder="Password to update details later"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                disabled={editSaving}
                style={{ padding: '12px 48px 12px 42px', fontSize: '0.9rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="editSecurityQuestionSelect" className="form-label" style={{ fontSize: '0.72rem' }}>Security Question (Required for password recovery)</label>
            <select
              id="editSecurityQuestionSelect"
              className="text-input"
              value={editSecurityQuestionType}
              onChange={(e) => setEditSecurityQuestionType(e.target.value)}
              disabled={editSaving}
              style={{
                padding: '12px 14px',
                fontSize: '0.9rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                borderRadius: '12px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="What is the name of your first pet?">What is the name of your first pet?</option>
              <option value="What is your secret name?">What is your secret name?</option>
              <option value="In what city were you born?">In what city were you born?</option>
              <option value="What was the name of your first school?">What was the name of your first school?</option>
              <option value="custom">Write your own custom question...</option>
            </select>
          </div>

          {editSecurityQuestionType === 'custom' && (
            <div className="form-group">
              <label htmlFor="editCustomSecurityQuestionInput" className="form-label" style={{ fontSize: '0.72rem' }}>Custom Security Question (Required)</label>
              <input
                id="editCustomSecurityQuestionInput"
                type="text"
                className="text-input"
                placeholder="Enter your custom question"
                value={editCustomSecurityQuestion}
                onChange={(e) => setEditCustomSecurityQuestion(e.target.value)}
                disabled={editSaving}
                style={{ padding: '12px 14px', fontSize: '0.9rem' }}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="editSecurityAnswerInput" className="form-label" style={{ fontSize: '0.72rem' }}>Security Answer (Required)</label>
            <input
              id="editSecurityAnswerInput"
              type="text"
              className="text-input"
              placeholder="Answer to security question"
              value={editSecurityAnswer}
              onChange={(e) => setEditSecurityAnswer(e.target.value)}
              disabled={editSaving}
              style={{ padding: '12px 14px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Dynamic socials wrapper */}
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="form-label" style={{ fontSize: '0.72rem', margin: 0 }}>Optional Contacts</span>
              <button
                type="button"
                onClick={() => setEditSocials(prev => [...prev, { type: 'Email', label: '', value: '' }])}
                className="btn"
                style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', borderRadius: '6px' }}
                disabled={editSaving}
              >
                <Plus size={12} />
                Add Option
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {editSocials.map((social, idx) => (
                <div key={idx} className="social-input-row">
                  <div className="social-dropdown-wrapper">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpenDropdownIdx(openDropdownIdx === idx ? null : idx); }}
                      disabled={editSaving}
                      className="social-dropdown-btn"
                    >
                      <span>{social.type}</span>
                      <span style={{ fontSize: '0.6rem', opacity: 0.5, marginLeft: '6px' }}>▼</span>
                    </button>

                    {openDropdownIdx === idx && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '6px',
                          background: '#0f172a',
                          border: '1px solid var(--border-light)',
                          borderRadius: '8px',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                          zIndex: 50,
                          overflow: 'hidden'
                        }}
                      >
                        {['Email', 'LinkedIn', 'GitHub', 'Instagram', 'Custom Link'].map((option) => (
                          <div
                            key={option}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSocialFieldChange(idx, 'type', option);
                              setOpenDropdownIdx(null);
                            }}
                            style={{
                              padding: '10px 12px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              color: social.type === option ? 'var(--accent-cyan)' : 'var(--text-primary)',
                              background: social.type === option ? 'rgba(255,255,255,0.04)' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                            onMouseLeave={(e) => e.target.style.background = social.type === option ? 'rgba(255,255,255,0.04)' : 'transparent'}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {social.type === 'Custom Link' && (
                    <input
                      type="text"
                      placeholder="Title"
                      value={social.label}
                      onChange={(e) => handleEditSocialFieldChange(idx, 'label', e.target.value)}
                      className="social-title-input"
                      disabled={editSaving}
                    />
                  )}

                  <input
                    type={social.type === 'Email' ? 'email' : 'text'}
                    placeholder={social.type === 'Email' ? 'owner@mail.com' : 'profile link'}
                    value={social.value}
                    onChange={(e) => handleEditSocialFieldChange(idx, 'value', e.target.value)}
                    className="social-value-input"
                    disabled={editSaving}
                  />

                  <button
                    type="button"
                    onClick={() => setEditSocials(prev => prev.filter((_, i) => i !== idx))}
                    className="btn btn-danger-outline social-delete-btn"
                    disabled={editSaving}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {editError && (
            <div className="status-msg status-msg-error" style={{ fontSize: '0.85rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{editError}</span>
            </div>
          )}

          {editSuccess && (
            <div className="status-msg status-msg-success" style={{ fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{editSuccess}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-confirm-no"
              onClick={onCancel}
              disabled={editSaving}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={editSaving || editSuccess}
              style={{ flex: 1 }}
            >
              {editSaving ? (
                <>
                  <div className="spinner"></div>
                  Saving...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CustomerEditProfile;
