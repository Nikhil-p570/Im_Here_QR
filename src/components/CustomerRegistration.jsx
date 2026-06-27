import { useState, useEffect } from 'react';
import './CustomerRegistration.css';
import { doc, setDoc } from 'firebase/firestore';
import { AlertTriangle, User, Phone, Lock, Plus, Trash2, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const COUNTRY_CODES = [
  { name: 'India', code: '91', flag: '🇮🇳' },
  { name: 'United States', code: '1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '44', flag: '🇬🇧' },
  { name: 'Australia', code: '61', flag: '🇦🇺' },
  { name: 'Canada', code: '1', flag: '🇨🇦' },
  { name: 'Germany', code: '49', flag: '🇩🇪' },
  { name: 'France', code: '33', flag: '🇫🇷' },
  { name: 'United Arab Emirates', code: '971', flag: '🇦🇪' },
  { name: 'Singapore', code: '65', flag: '🇸🇬' },
  { name: 'Saudi Arabia', code: '966', flag: '🇸🇦' },
  { name: 'South Africa', code: '27', flag: '🇿🇦' },
  { name: 'New Zealand', code: '64', flag: '🇳🇿' },
  { name: 'Japan', code: '81', flag: '🇯🇵' },
  { name: 'Brazil', code: '55', flag: '🇧🇷' },
  { name: 'Mexico', code: '52', flag: '🇲🇽' },
  { name: 'Italy', code: '39', flag: '🇮🇹' },
  { name: 'Spain', code: '34', flag: '🇪🇸' },
  { name: 'Russia', code: '7', flag: '🇷🇺' },
  { name: 'China', code: '86', flag: '🇨🇳' },
  { name: 'Bangladesh', code: '880', flag: '🇧🇩' },
  { name: 'Pakistan', code: '92', flag: '🇵🇰' },
  { name: 'Sri Lanka', code: '94', flag: '🇱🇰' },
  { name: 'Nepal', code: '977', flag: '🇳🇵' }
];

const CustomerRegistration = ({
  firestoreDb,
  customerId,
  onSuccess
}) => {
  const [regName, setRegName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regSecurityQuestionType, setRegSecurityQuestionType] = useState("What is the name of your first pet?");
  const [regCustomSecurityQuestion, setRegCustomSecurityQuestion] = useState("");
  const [regSecurityAnswer, setRegSecurityAnswer] = useState("");
  const [socials, setSocials] = useState([]);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [savingReg, setSavingReg] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [openDropdownIdx, setOpenDropdownIdx] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdownIdx(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleAddSocial = () => {
    setSocials(prev => [...prev, { type: 'Email', value: '', label: '' }]);
  };

  const handleRemoveSocial = (idx) => {
    setSocials(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSocialFieldChange = (idx, field, val) => {
    setSocials(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const handleSaveRegistration = async (e) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");
    setSavingReg(true);

    const nameVal = regName.trim();
    const numberVal = regNumber.replace(/\D/g, ''); // digits only
    const passwordVal = regPassword.trim();
    const questionTypeVal = regSecurityQuestionType;
    const customQuestionVal = regCustomSecurityQuestion.trim();
    const answerVal = regSecurityAnswer.trim();

    // 1. Core validations
    if (!numberVal) {
      setRegError("Contact phone number is required.");
      setSavingReg(false);
      return;
    }
    const isIndia = selectedCountry.code === '91';
    if (isIndia && numberVal.length !== 10) {
      setRegError("Indian phone numbers must be exactly 10 digits.");
      setSavingReg(false);
      return;
    }
    if (numberVal.length < 7 || numberVal.length > 15) {
      setRegError("Phone number must be between 7 and 15 digits.");
      setSavingReg(false);
      return;
    }
    if (!passwordVal) {
      setRegError("Please specify a tag password so you can update details later.");
      setSavingReg(false);
      return;
    }

    // Security Question & Answer Validation
    if (questionTypeVal === 'custom' && !customQuestionVal) {
      setRegError("Please enter your custom security question.");
      setSavingReg(false);
      return;
    }
    if (!answerVal) {
      setRegError("Please specify a security answer to prove your identity.");
      setSavingReg(false);
      return;
    }

    // 2. Social fields validation
    const cleanedSocials = [];
    for (const social of socials) {
      const type = social.type;
      let val = social.value.trim();
      let lbl = social.label.trim();

      if (!val) continue; // ignore empty value lines

      if (type === 'Email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          setRegError(`Please enter a valid email address: "${val}"`);
          setSavingReg(false);
          return;
        }
        lbl = 'Email';
      } else {
        if (type !== 'Custom Link' && !lbl) {
          lbl = type;
        }
        if (type === 'Custom Link' && !lbl) {
          setRegError("Please enter a title for your custom link.");
          setSavingReg(false);
          return;
        }
        // Normalize typical URL structures
        if (val.includes('.') && !/^https?:\/\//i.test(val)) {
          val = `https://${val}`;
        }
      }

      cleanedSocials.push({ type, label: lbl, value: val });
    }

    const combinedNumber = `${selectedCountry.code}${numberVal}`;

    try {
      if (!customerId) throw new Error("No customer ID found in URL.");
      
      const updatePayload = {
        action: 'register',
        id: customerId,
        name: nameVal,
        number: combinedNumber,
        altNumber: '',
        whatsappEnabled: true,
        message: 'Hi! If you found my item, please get in touch.',
        rewardEnabled: false,
        rewardAmount: '',
        socials: cleanedSocials,
        password: passwordVal,
        securityQuestion: questionTypeVal === 'custom' ? customQuestionVal : questionTypeVal,
        securityAnswer: answerVal
      };

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRegSuccess("Finally claimed! We're official now. 😉🎉");
        setTimeout(() => {
          onSuccess(data.profile);
        }, 1000);
      } else {
        setRegError(data.error || 'Failed to save details.');
      }
    } catch (err) {
      console.error(err);
      setRegError(`Failed to save details: ${err.message}`);
    } finally {
      setSavingReg(false);
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '520px', alignSelf: 'center' }}>
      <main className="glass-panel card-content" style={{ padding: '36px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/full logo.png" alt="I'm here" style={{ width: '160px', height: 'auto', borderRadius: '12px', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-indigo) 70%, var(--accent-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            You're the first one to scan me! Claim me!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', lineHeight: '1.5' }}>
            This physical tag is unclaimed and waiting for you. Claim me first to link your contact details, set up your profile, and make sure your gear is always connected to you!
          </p>
        </div>

        <div className="status-msg status-msg-error" style={{ fontSize: '0.8rem', padding: '10px 14px', marginBottom: '20px', borderStyle: 'dashed' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            ⚠️ Keep it clean: Anyone who scans this physical tag will see the digital secrets you drop below.
          </span>
        </div>

        <form onSubmit={handleSaveRegistration} className="form-group" style={{ gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="regNameInput" className="form-label" style={{ fontSize: '0.72rem' }}>Name (Optional)</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input
                id="regNameInput"
                type="text"
                className="text-input"
                placeholder="e.g. Nikhil P."
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                disabled={savingReg}
                style={{ padding: '12px 14px 12px 42px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="regNumberInput" className="form-label" style={{ fontSize: '0.72rem' }}>Phone Number (Required)</label>
            <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
              {/* Searchable Country Code Dropdown */}
              <div style={{ position: 'relative', width: '130px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowCountryDropdown(!showCountryDropdown); }}
                  disabled={savingReg}
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
                  <span>{selectedCountry.flag} +{selectedCountry.code}</span>
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
                            setSelectedCountry(c);
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
                            color: selectedCountry.code === c.code ? 'var(--accent-cyan)' : 'var(--text-primary)',
                            background: selectedCountry.code === c.code ? 'rgba(255,255,255,0.04)' : 'transparent'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={(e) => e.target.style.background = selectedCountry.code === c.code ? 'rgba(255,255,255,0.04)' : 'transparent'}
                        >
                          <span>{c.flag} {c.name}</span>
                          <span style={{ opacity: 0.6 }}>+{c.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Phone Number Input */}
              <div className="input-wrapper" style={{ flex: 1 }}>
                <Phone className="input-icon" size={18} />
                <input
                  id="regNumberInput"
                  type="tel"
                  className="text-input"
                  placeholder={selectedCountry.code === '91' ? "10-digit mobile number" : "Mobile number"}
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  disabled={savingReg}
                  style={{ padding: '12px 14px 12px 42px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="regPasswordInput" className="form-label" style={{ fontSize: '0.72rem' }}>Password (Remember it so in case you want to change your details in the future - Required)</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="regPasswordInput"
                type={showPassword ? "text" : "password"}
                className="text-input"
                placeholder="Password to update details later"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                disabled={savingReg}
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
            <label htmlFor="regSecurityQuestionSelect" className="form-label" style={{ fontSize: '0.72rem' }}>Security Question (Required for password recovery)</label>
            <select
              id="regSecurityQuestionSelect"
              className="text-input"
              value={regSecurityQuestionType}
              onChange={(e) => setRegSecurityQuestionType(e.target.value)}
              disabled={savingReg}
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
              <option value="What is the name of your first pet?" style={{ background: '#0f172a' }}>What is the name of your first pet?</option>
              <option value="What is your secret name?" style={{ background: '#0f172a' }}>What is your secret name?</option>
              <option value="In what city were you born?" style={{ background: '#0f172a' }}>In what city were you born?</option>
              <option value="What was the name of your first school?" style={{ background: '#0f172a' }}>What was the name of your first school?</option>
              <option value="custom" style={{ background: '#0f172a' }}>Write your own custom question...</option>
            </select>
          </div>

          {regSecurityQuestionType === 'custom' && (
            <div className="form-group">
              <label htmlFor="regCustomSecurityQuestionInput" className="form-label" style={{ fontSize: '0.72rem' }}>Custom Security Question (Required)</label>
              <input
                id="regCustomSecurityQuestionInput"
                type="text"
                className="text-input"
                placeholder="Enter your custom question"
                value={regCustomSecurityQuestion}
                onChange={(e) => setRegCustomSecurityQuestion(e.target.value)}
                disabled={savingReg}
                style={{ padding: '12px 14px', fontSize: '0.9rem' }}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="regSecurityAnswerInput" className="form-label" style={{ fontSize: '0.72rem' }}>Security Answer (Required)</label>
            <input
              id="regSecurityAnswerInput"
              type="text"
              className="text-input"
              placeholder="Answer to security question"
              value={regSecurityAnswer}
              onChange={(e) => setRegSecurityAnswer(e.target.value)}
              disabled={savingReg}
              style={{ padding: '12px 14px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Dynamic socials wrapper */}
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="form-label" style={{ fontSize: '0.72rem', margin: 0 }}>Where else can I find you? (Optional Contacts)</span>
              <button
                type="button"
                onClick={handleAddSocial}
                className="btn"
                style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', borderRadius: '6px' }}
                disabled={savingReg}
              >
                <Plus size={12} />
                Add Option
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {socials.map((social, idx) => (
                <div key={idx} className="social-input-row">
                  <div className="social-dropdown-wrapper">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpenDropdownIdx(openDropdownIdx === idx ? null : idx); }}
                      disabled={savingReg}
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
                              handleSocialFieldChange(idx, 'type', option);
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
                      placeholder="Title (e.g. YouTube)"
                      value={social.label}
                      onChange={(e) => handleSocialFieldChange(idx, 'label', e.target.value)}
                      className="social-title-input"
                      disabled={savingReg}
                    />
                  )}

                  <input
                    type={social.type === 'Email' ? 'email' : 'text'}
                    placeholder={social.type === 'Email' ? 'owner@mail.com' : 'profile link or username'}
                    value={social.value}
                    onChange={(e) => handleSocialFieldChange(idx, 'value', e.target.value)}
                    className="social-value-input"
                    disabled={savingReg}
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveSocial(idx)}
                    className="btn btn-danger-outline social-delete-btn"
                    disabled={savingReg}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {regError && (
            <div className="status-msg status-msg-error" style={{ fontSize: '0.85rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{regError}</span>
            </div>
          )}

          {regSuccess && (
            <div className="status-msg status-msg-success" style={{ fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{regSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingReg || regSuccess}
            style={{ width: '100%', marginTop: '10px' }}
          >
            {savingReg ? (
              <>
                <div className="spinner"></div>
                Claiming tag...
              </>
            ) : (
              <>
                <ShieldCheck size={20} />
                Claim me! 💖
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default CustomerRegistration;
export { COUNTRY_CODES };
