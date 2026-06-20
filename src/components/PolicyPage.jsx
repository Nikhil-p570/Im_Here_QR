import React from 'react';

const POLICIES = {
  '/terms': {
    title: 'Terms & Conditions',
    lastUpdated: 'June 2026',
    content: (
      <ol style={{ listStyleType: 'decimal', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <li>
          This document is an electronic record in terms of Information Technology Act, 2000 and rules 
          there under as applicable and the amended provisions pertaining to electronic records in various 
          statutes as amended by the Information Technology Act, 2000. This electronic record is generated 
          by a computer system and does not require any physical or digital signatures.
        </li>
        <li>
          This document is published in accordance with the provisions of Rule 3 (1) of the Information 
          Technology (Intermediaries guidelines) Rules, 2011 that require publishing the rules and 
          regulations, privacy policy and Terms of Use for access or usage of domain name <a href="https://im-here-qr.vercel.app/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>https://im-here-qr.vercel.app/</a> ('Website'), including the related mobile site and mobile application (hereinafter 
          referred to as 'Platform').
        </li>
        <li>
          The Platform is owned by <strong>Im Here</strong>, a company incorporated under the Companies Act, 1956 with 
          its registered office at Hyderabad, Telangana (hereinafter referred to as ‘Platform Owner’, 'we', 
          'us', 'our').
        </li>
        <li>
          Your use of the Platform and services and tools are governed by the following terms and 
          conditions (“Terms of Use”) as applicable to the Platform including the applicable policies which 
          are incorporated herein by way of reference. If You transact on the Platform, You shall be subject 
          to the policies that are applicable to the Platform for such transaction. By mere use of the Platform, 
          You shall be contracting with the Platform Owner and these terms and conditions including the 
          policies constitute Your binding obligations, with Platform Owner. These Terms of Use relate to 
          your use of our website, goods (as applicable) or services (as applicable) (collectively, 'Services'). 
          Any terms and conditions proposed by You which are in addition to or which conflict with these 
          Terms of Use are expressly rejected by the Platform Owner and shall be of no force or effect. 
          These Terms of Use can be modified at any time without assigning any reason. It is your 
          responsibility to periodically review these Terms of Use to stay informed of updates.
        </li>
        <li>
          For the purpose of these Terms of Use, wherever the context so requires ‘you’, 'your' or ‘user’ shall 
          mean any natural or legal person who has agreed to become a user/buyer on the Platform.
        </li>
        <li>
          ACCESSING, BROWSING OR OTHERWISE USING THE PLATFORM INDICATES YOUR 
          AGREEMENT TO ALL THE TERMS AND CONDITIONS UNDER THESE TERMS OF USE, 
          SO PLEASE READ THE TERMS OF USE CAREFULLY BEFORE PROCEEDING.
        </li>
        <li>
          The use of Platform and/or availing of our Services is subject to the following Terms of Use:
          <ol style={{ listStyleType: 'decimal', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <li>
              To access and use the Services, you agree to provide true, accurate and complete information 
              to us during and after registration, and you shall be responsible for all acts done through the 
              use of your registered account on the Platform.
            </li>
            <li>
              Neither we nor any third parties provide any warranty or guarantee as to the accuracy, 
              timeliness, performance, completeness or suitability of the information and materials offered 
              on this website or through the Services, for any specific purpose. You acknowledge that such 
              information and materials may contain inaccuracies or errors and we expressly exclude 
              liability for any such inaccuracies or errors to the fullest extent permitted by law.
            </li>
            <li>
              Your use of our Services and the Platform is solely and entirely at your own risk and 
              discretion for which we shall not be liable to you in any manner. You are required to 
              independently assess and ensure that the Services meet your requirements.
            </li>
            <li>
              The contents of the Platform and the Services are proprietary to us and are licensed to us. 
              You will not have any authority to claim any intellectual property rights, title, or interest in 
              its contents. The contents includes and is not limited to the design, layout, look and graphics.
            </li>
            <li>
              You acknowledge that unauthorized use of the Platform and/or the Services may lead to 
              action against you as per these Terms of Use and/or applicable laws.
            </li>
            <li>
              You agree to pay us the charges associated with availing the Services.
            </li>
            <li>
              You agree not to use the Platform and/ or Services for any purpose that is unlawful, illegal or 
              forbidden by these Terms, or Indian or local laws that might apply to you.
            </li>
            <li>
              You agree and acknowledge that website and the Services may contain links to other third 
              party websites. On accessing these links, you will be governed by the terms of use, privacy 
              policy and such other policies of such third party websites. These links are provided for your 
              convenience for provide further information.
            </li>
            <li>
              You understand that upon initiating a transaction for availing the Services you are entering 
              into a legally binding and enforceable contract with the Platform Owner for the Services.
            </li>
            <li>
              You shall indemnify and hold harmless Platform Owner, its affiliates, group companies (as 
              applicable) and their respective officers, directors, agents, and employees, from any claim or 
              demand, or actions including reasonable attorney's fees, made by any third party or penalty 
              imposed due to or arising out of Your breach of this Terms of Use, privacy Policy and other 
              Policies, or Your violation of any law, rules or regulations or the rights (including 
              infringement of intellectual property rights) of a third party.
            </li>
            <li>
              Notwithstanding anything contained in these Terms of Use, the parties shall not be liable for 
              any failure to perform an obligation under these Terms if performance is prevented or 
              delayed by a force majeure event.
            </li>
            <li>
              These Terms and any dispute or claim relating to it, or its enforceability, shall be governed 
              by and construed in accordance with the laws of India.
            </li>
            <li>
              All disputes arising out of or in connection with these Terms shall be subject to the exclusive 
              jurisdiction of the courts in Hyderabad, Telangana.
            </li>
            <li>
              All concerns or communications relating to these Terms must be communicated to us using the 
              contact information provided on this website.
            </li>
          </ol>
        </li>
      </ol>
    )
  },
  '/privacy': {
    title: 'Privacy Policy',
    lastUpdated: 'June 2026',
    content: (
      <>
        <p>Welcome to <strong>I'm Here</strong> ("we", "our", "us"). We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect information when you use our website and services available at <a href="https://im-here-qr.vercel.app/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>https://im-here-qr.vercel.app/</a>.</p>
        <p>By accessing or using our platform, you agree to the practices described in this Privacy Policy.</p>

        <div className="policy-section">
          <h3>1. Information We Collect</h3>
          <p>We may collect the following information:</p>
          <ul>
            <li>Name</li>
            <li>Mobile Number</li>
            <li>Email Address</li>
            <li>Address (if voluntarily provided)</li>
            <li>Information submitted during account registration</li>
            <li>Information associated with QR tags registered on our platform</li>
            <li>Device and browser information</li>
            <li>IP address and usage analytics</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>2. How We Use Information</h3>
          <p>We use collected information to:</p>
          <ul>
            <li>Create and manage user accounts</li>
            <li>Associate QR tags with their rightful owners</li>
            <li>Facilitate communication between finders and owners of lost items</li>
            <li>Provide customer support</li>
            <li>Improve platform functionality and user experience</li>
            <li>Prevent fraud and misuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>3. Information Sharing</h3>
          <p>We do not sell, rent, or trade your personal information.</p>
          <p>We may share information only:</p>
          <ul>
            <li>When required by law</li>
            <li>To comply with legal proceedings</li>
            <li>To protect our rights, users, or platform security</li>
            <li>With trusted service providers who assist in operating the platform</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>4. Data Security</h3>
          <p>We implement reasonable technical and organizational measures to protect user information against unauthorized access, loss, misuse, or disclosure.</p>
          <p>However, no internet-based service can guarantee complete security, and users acknowledge this inherent risk.</p>
        </div>

        <div className="policy-section">
          <h3>5. Data Retention</h3>
          <p>We retain personal information only as long as necessary to provide services, comply with legal obligations, resolve disputes, and enforce agreements.</p>
          <p>Users may request deletion of their account and associated information by contacting us.</p>
        </div>

        <div className="policy-section">
          <h3>6. User Rights</h3>
          <p>Users may:</p>
          <ul>
            <li>Access their personal information</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of their account</li>
            <li>Withdraw consent where applicable</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>7. Cookies and Analytics</h3>
          <p>Our platform may use cookies and similar technologies to improve user experience, analyze traffic, and maintain platform functionality.</p>
          <p>Users may disable cookies through browser settings; however, some features may not function properly.</p>
        </div>

        <div className="policy-section">
          <h3>8. Third-Party Services</h3>
          <p>Our platform may utilize third-party services such as hosting providers, analytics providers, payment gateways, and communication services. These services operate under their own privacy policies.</p>
        </div>

        <div className="policy-section">
          <h3>9. Children's Privacy</h3>
          <p>Our services are not intended for children under the age of 18 without parental supervision. We do not knowingly collect personal information from children.</p>
        </div>

        <div className="policy-section">
          <h3>10. Changes to This Policy</h3>
          <p>We may update this Privacy Policy from time to time. Updated versions will be published on the platform with the revised date.</p>
        </div>

        <div className="policy-section">
          <h3>11. Contact Information</h3>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p><strong>Grievance Officer:</strong> Pabbisetti Soma Naga Venkata Sai Nikhil</p>
            <p><strong>Designation:</strong> Founder</p>
            <p><strong>Company:</strong> I'm Here</p>
            <p><strong>Address:</strong> 1097 MIG, Stay Ezy Boys Hostel, HUDA Layout, Miyapur, Hyderabad, Telangana, India</p>
            <p><strong>Email:</strong> <a href="mailto:support@im-here-qr.vercel.app" style={{ color: 'var(--accent-cyan)' }}>support@im-here-qr.vercel.app</a></p>
            <p><strong>Phone:</strong> +91 8919626878</p>
            <p><strong>Working Hours:</strong> Monday to Friday, 9:00 AM – 6:00 PM IST</p>
          </div>
        </div>
      </>
    )
  },
  '/return_policy': {
    title: 'Return Policy',
    lastUpdated: 'June 2026',
    content: (
      <>
        <p>We do not offer returns, exchanges, or refunds of any kind for products or services purchased through our platform. All sales of our smart QR keychains and customized items are final.</p>
        <p>Please review your customization details, background images, and order quantities carefully before placing your order. We are not responsible for customer errors, including but not limited to typos in owner details, incorrect background image placement, or choosing the wrong quantities.</p>
        <p>In the rare event that you receive a defective or physically damaged item, please contact our customer support team within 15 days of receiving the product at <a href="mailto:support@im-here-qr.vercel.app" style={{ color: 'var(--accent-cyan)' }}>support@im-here-qr.vercel.app</a> with proof of purchase and photographs of the damage. Approved replacement requests for defective/damaged items will be processed in accordance with our quality check criteria.</p>
      </>
    )
  },
  '/shipping_policy': {
    title: 'Shipping Policy',
    lastUpdated: 'June 2026',
    content: (
      <>
        <p>The orders for the user are shipped through registered domestic courier companies and/or speed post only. Orders are shipped within 15 days from the date of the order and/or payment or as per the delivery date agreed at the time of order confirmation and delivery of the shipment, subject to courier company / post office norms. Platform Owner shall not be liable for any delay in delivery by the courier company / postal authority. Delivery of all orders will be made to the address provided by the buyer at the time of purchase. Delivery of our services will be confirmed on your email ID as specified at the time of registration. If there are any shipping cost(s) levied by the seller or the Platform Owner (as the case may be), the same is not refundable.</p>
      </>
    )
  },
  '/refund_policy': {
    title: 'Refund & Cancellation Policy',
    lastUpdated: 'June 2026',
    content: (
      <>
        <p>This refund and cancellation policy outlines how you can cancel or seek a refund for a product / service that you have purchased through the Platform. Under this policy:</p>
        <ol style={{ listStyleType: 'decimal', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <li>
            Cancellations will only be considered if the request is made within 15 days of placing the order. 
            However, cancellation requests may not be entertained if the orders have been communicated to 
            such sellers / merchant(s) listed on the Platform and they have initiated the process of shipping 
            them, or the product is out for delivery. In such an event, you may choose to reject the product at 
            the doorstep.
          </li>
          <li>
            Im Here does not accept cancellation requests for perishable items like flowers, eatables, etc. 
            However, the refund / replacement can be made if the user establishes that the quality of the 
            product delivered is not good.
          </li>
          <li>
            In case of receipt of damaged or defective items, please report to our customer service team. The 
            request would be entertained once the seller/ merchant listed on the Platform, has checked and 
            determined the same at its own end. This should be reported within 15 days of receipt of products. 
            In case you feel that the product received is not as shown on the site or as per your expectations, 
            you must bring it to the notice of our customer service within 15 days of receiving the product. 
            The customer service team after looking into your complaint will take an appropriate decision.
          </li>
          <li>
            In case of complaints regarding the products that come with a warranty from the manufacturers, 
            please refer the issue to them.
          </li>
          <li>
            In case of any refunds approved by Im Here, it will take 15 days for the refund to be processed to 
            you.
          </li>
        </ol>
      </>
    )
  }
};

const PolicyPage = () => {
  const path = window.location.pathname;
  const policy = POLICIES[path];

  if (!policy) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Page Not Found</h2>
        <a href="/" className="btn btn-primary" style={{ marginTop: '20px', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ maxWidth: '760px', alignSelf: 'center', padding: '40px 20px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '20px', marginBottom: '24px' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
          <img src="/logo icon.png" alt="I'm Here" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 50%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            I'm Here
          </span>
        </a>
        <a href="/orders" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-indigo)', textDecoration: 'none' }}>
          Order Tags →
        </a>
      </header>

      <main className="glass-panel" style={{ padding: '36px 28px' }}>
        <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>{policy.title}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Last Updated: {policy.lastUpdated}</p>
        </div>

        <div className="policy-body">
          {policy.content}
        </div>
      </main>

      <footer className="policy-footer">
        <a href="/">Home</a>
        <span style={{ color: 'var(--border-light)' }}>•</span>
        <a href="/terms">Terms</a>
        <span style={{ color: 'var(--border-light)' }}>•</span>
        <a href="/privacy">Privacy</a>
        <span style={{ color: 'var(--border-light)' }}>•</span>
        <a href="/shipping_policy">Shipping</a>
        <span style={{ color: 'var(--border-light)' }}>•</span>
        <a href="/refund_policy">Refund Policy</a>
      </footer>
    </div>
  );
};

export default PolicyPage;
