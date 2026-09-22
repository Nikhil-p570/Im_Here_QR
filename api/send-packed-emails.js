import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// Helper to load dotenv keys locally if not defined in process.env (for local dev testing)
const getEnv = (key) => {
  if (process.env[key]) {
    return process.env[key];
  }
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().startsWith('#') || !line.includes('=')) continue;
        const [k, ...v] = line.split('=');
        if (k.trim() === key) {
          return v.join('=').trim().replace(/^['"]|['"]$/g, '');
        }
      }
    }
  } catch (err) {
    // Ignore errors reading local .env file
  }
  return null;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { boxes } = req.body;

    if (!boxes || !Array.isArray(boxes)) {
      return res.status(400).json({ error: 'Invalid payload: expected boxes array' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: getEnv('GMAIL_USER'),
        pass: getEnv('GMAIL_APP_PASSWORD')
      }
    });

    const results = [];

    for (const box of boxes) {
      const customerEmail = box.orderedEmail || 'nikhil.pabbisetti2006@gmail.com'; // fallback if needed
      
      const mailOptions = {
        from: `"I'm Here" <${getEnv('GMAIL_USER')}>`,
        to: customerEmail,
        subject: `Your Order is Packed! - I'm Here (Order #${box.orderId || 'N/A'})`,
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; color: #0f172a;">
            <img src="https://im-here-qr.vercel.app/full%20logo%20black.png" alt="I'm Here Logo" style="width: 140px; margin-bottom: 20px;" />
            
            <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">Your Order is Ready to Ship!</h1>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              Hi ${box.customerName || 'there'},<br/>
              Great news! Your premium tags have been packed in Box ${box.boxNum} and are ready.
            </p>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0; border: 1px solid #e2e8f0;">
              <h2 style="font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 15px;">Order Details</h2>
              <p style="margin: 5px 0;"><strong>Order ID:</strong> ${box.orderId || 'N/A'}</p>
            </div>

            <p style="font-size: 16px; color: #475569; line-height: 1.6;">
              A delivery pickup person will collect your package from our warehouse soon. You will receive another update with tracking details once it's on the way!
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            
            <p style="font-size: 14px; color: #64748b;">
              In case of any support or queries, you can reach out to us at <a href="mailto:nikhil.pabbisetti2006@gmail.com" style="color: #4f46e5; font-weight: 600; text-decoration: none;">nikhil.pabbisetti2006@gmail.com</a>.
            </p>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        results.push({ box: box.boxNum, status: 'success', email: customerEmail });
      } catch (err) {
        results.push({ box: box.boxNum, status: 'error', error: err.message, email: customerEmail });
      }
    }

    return res.status(200).json({ success: true, results });

  } catch (error) {
    console.error("Failed to send packed emails:", error);
    return res.status(500).json({ error: error.message });
  }
}
