import nodemailer from 'nodemailer';

// Configure email transporter
const createTransporter = () => {
  // You can configure this with your email provider (Gmail, Outlook, etc.)
  // For Gmail, you'll need to create an App Password
  
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
    }
  });

  return transporter;
};

// Email template for low stock alert
const createLowStockEmailTemplate = (lowStockItems) => {
  const totalItems = lowStockItems.length;
  const criticalCount = lowStockItems.filter(item => item.quantity === 0).length;
  const lowCount = lowStockItems.filter(item => item.quantity > 0 && item.quantity <= item.minimumQuantity).length;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .critical-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
          .item-row { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; 
                      box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .item-name { font-weight: bold; color: #667eea; font-size: 1.1em; }
          .item-details { color: #666; margin: 5px 0; }
          .quantity { display: inline-block; padding: 5px 10px; border-radius: 5px; 
                     font-weight: bold; margin-top: 10px; }
          .urgent { background: #dc3545; color: white; }
          .critical { background: #fd7e14; color: white; }
          .low { background: #ffc107; color: #333; }
          .footer { text-align: center; color: #666; margin-top: 30px; font-size: 0.9em; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #667eea; color: white; }
          .no-items { text-align: center; padding: 40px; color: #666; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Weekly Low Stock Alert</h1>
            <p style="margin: 0;">Inventory Management System</p>
          </div>
          
          <div class="content">
            <div class="alert-box">
              <strong>📊 Summary:</strong> You have <strong>${totalItems}</strong> item(s) requiring attention.
              ${criticalCount > 0 ? `<div style="margin-top: 10px;"><strong>🚨 Critical:</strong> ${criticalCount} item(s) are out of stock</div>` : ''}
              ${lowCount > 0 ? `<div><strong>⚠️ Low Stock:</strong> ${lowCount} item(s) need restocking</div>` : ''}
            </div>

            ${totalItems > 0 ? `
            <h2 style="color: #667eea; margin-top: 30px;">Items Requiring Attention:</h2>
            
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Make/Model</th>
                  <th>Location</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockItems.map(item => `
                  <tr>
                    <td>
                      <span class="item-name">${item.name || 'N/A'}</span>
                      <div class="item-details">${item.specification || ''}</div>
                    </td>
                    <td>
                      <div>${item.make || 'N/A'} ${item.model || ''}</div>
                    </td>
                    <td>
                      Row ${item.rack || 'N/A'} - Column ${item.bin || 'N/A'}
                    </td>
                    <td>
                      <span class="quantity ${item.quantity === 0 ? 'urgent' : item.quantity <= 2 ? 'critical' : 'low'}">
                        ${item.quantity}
                      </span>
                    </td>
                    <td>
                      <strong>${item.quantity === 0 ? 'OUT OF STOCK' : item.quantity <= 2 ? 'CRITICAL' : 'LOW STOCK'}</strong>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : '<div class="no-items">✅ No low stock items this week!</div>'}
            
            <div class="footer">
              <p>This is an automated weekly report from your Inventory Management System.</p>
              <p style="margin-top: 10px; color: #999; font-size: 0.85em;">
                Generated on: ${new Date().toLocaleString('en-IN', { 
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Send low stock alert email
export const sendLowStockEmail = async (lowStockItems, recipientEmails) => {
  try {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('⚠️ Email not configured. Set EMAIL_USER and EMAIL_PASSWORD environment variables.');
      return { success: false, message: 'Email not configured' };
    }

    const transporter = createTransporter();
    const emailHtml = createLowStockEmailTemplate(lowStockItems);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmails.join(', '),
      subject: `🔔 Weekly Low Stock Alert - ${lowStockItems.length} Item(s) Need Attention`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Low stock email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending low stock email:', error);
    return { success: false, error: error.message };
  }
};

// Send test email
export const sendTestEmail = async (recipientEmail) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return { success: false, message: 'Email not configured' };
    }

    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: '✅ Test Email - Inventory Management System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email</h2>
          <p>This is a test email from your Inventory Management System.</p>
          <p>If you received this email, your email configuration is working correctly! ✅</p>
          <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
            Sent on: ${new Date().toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending test email:', error);
    return { success: false, error: error.message };
  }
};

