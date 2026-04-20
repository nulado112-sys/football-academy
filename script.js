class FootballAcademy {
    constructor() {
        // Simple password protection
        this.checkAccess();
        this.members = this.loadMembers();
        this.init();
    }

    checkAccess() {
        const password = localStorage.getItem('academy-password');
        const expiry = localStorage.getItem('academy-password-expiry');
        
        // Check if password has expired first
        if (expiry && Date.now() > parseInt(expiry)) {
            localStorage.removeItem('academy-password');
            localStorage.removeItem('academy-password-expiry');
        }
        
        // Check if password is verified and valid
        const validPassword = localStorage.getItem('academy-password');
        if (!validPassword || validPassword !== 'verified') {
            const userPassword = prompt('Enter password to access Football Academy:');
            if (userPassword !== 'academy123') {
                alert('Wrong password! Access denied.');
                document.body.innerHTML = '<div style="text-align:center;margin-top:50px;font-family:Arial;"><h1>🚫 Access Denied</h1><p>Contact the administrator for access.</p></div>';
                return;
            }
            localStorage.setItem('academy-password', 'verified');
            // Set expiry for 180 days (6 months) - much longer
            localStorage.setItem('academy-password-expiry', Date.now() + (180 * 24 * 60 * 60 * 1000));
        }
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.checkPaymentReminders();
        this.checkDailyPaymentDues(); // Check for daily dues on app load
        
        // Check for reminders every 30 minutes (reduced frequency)
        setInterval(() => {
            this.checkPaymentReminders();
        }, 1800000);
        
        // Daily check for due payments (runs every hour but only notifies once per day)
        setInterval(() => {
            this.checkDailyPaymentDues();
        }, 3600000);
    }

    setupEventListeners() {
        document.getElementById('member-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMember();
        });

        // Set today's date as default
        document.getElementById('join-date').valueAsDate = new Date();
    }

    addMember() {
        const name = document.getElementById('member-name').value;
        const phone = document.getElementById('member-phone').value;
        const joinDate = document.getElementById('join-date').value;
        const monthlyFee = parseFloat(document.getElementById('monthly-fee').value);

        if (!name || !phone || !joinDate || !monthlyFee) {
            alert('Please fill all fields');
            return;
        }

        const member = {
            id: Date.now(),
            name: name,
            phone: phone,
            joinDate: joinDate,
            monthlyFee: monthlyFee,
            payments: []
        };

        this.members.push(member);
        this.saveMembers();
        this.updateDisplay();

        // Clear form
        document.getElementById('member-form').reset();
        document.getElementById('join-date').valueAsDate = new Date();

        alert(`${name} has been added successfully!`);
    }

    getNextPaymentDate(member) {
        const joinDate = new Date(member.joinDate);
        const today = new Date();
        const joinDay = joinDate.getDate();
        
        // Calculate next payment date
        let nextPayment = new Date(today.getFullYear(), today.getMonth(), joinDay);
        
        // If this month's payment date has passed, move to next month
        if (nextPayment <= today) {
            nextPayment = new Date(today.getFullYear(), today.getMonth() + 1, joinDay);
        }

        return nextPayment;
    }

    getPaymentStatus(member) {
        const nextPayment = this.getNextPaymentDate(member);
        const today = new Date();
        const diffDays = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));

        // Check if payment for current month is made
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const hasPaymentThisMonth = member.payments.some(payment => {
            const paymentDate = new Date(payment.date);
            return paymentDate.getMonth() === currentMonth && 
                   paymentDate.getFullYear() === currentYear;
        });

        if (hasPaymentThisMonth) {
            return { status: 'paid', daysUntilNext: diffDays };
        } else if (diffDays < 0) {
            return { status: 'overdue', daysUntilNext: Math.abs(diffDays) };
        } else if (diffDays <= 3) {
            return { status: 'pending', daysUntilNext: diffDays };
        } else {
            return { status: 'upcoming', daysUntilNext: diffDays };
        }
    }

    markAsPaid(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member) {
            const paymentDate = new Date().toISOString().split('T')[0];
            const receiptNumber = `JZ-${Date.now()}`;
            
            member.payments.push({
                date: paymentDate,
                amount: member.monthlyFee,
                receiptNumber: receiptNumber
            });
            this.saveMembers();
            this.updateDisplay();
            
            // Send receipt via WhatsApp automatically
            this.sendReceiptViaWhatsApp(member, paymentDate, receiptNumber);
            alert(`Payment recorded for ${member.name}.\n📷 Photo receipt downloaded!\n📱 WhatsApp opened to send receipt.`);
        }
    }

    removeMember(memberId) {
        if (confirm('Are you sure you want to remove this member?')) {
            this.members = this.members.filter(m => m.id !== memberId);
            this.saveMembers();
            this.updateDisplay();
        }
    }

    updateDisplay() {
        this.updateStats();
        this.displayMembers();
    }

    updateStats() {
        const totalMembers = this.members.length;
        let pendingPayments = 0;

        this.members.forEach(member => {
            const status = this.getPaymentStatus(member);
            if (status.status === 'pending' || status.status === 'overdue') {
                pendingPayments++;
            }
        });

        document.getElementById('total-members').textContent = totalMembers;
        document.getElementById('pending-payments').textContent = pendingPayments;
    }

    displayMembers() {
        const container = document.getElementById('members-list');
        
        if (this.members.length === 0) {
            container.innerHTML = '<div class="empty-state">No members yet. Add your first member above!</div>';
            return;
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        this.members.forEach(member => {
            const status = this.getPaymentStatus(member);
            const nextPayment = this.getNextPaymentDate(member);
            
            let statusClass = '';
            let statusText = '';
            let statusMessage = '';

            switch (status.status) {
                case 'paid':
                    statusClass = 'status-paid';
                    statusText = 'Paid';
                    statusMessage = `Next payment in ${status.daysUntilNext} days`;
                    break;
                case 'pending':
                    statusClass = 'status-pending';
                    statusText = 'Due Soon';
                    statusMessage = `Payment due in ${status.daysUntilNext} days`;
                    break;
                case 'overdue':
                    statusClass = 'status-overdue';
                    statusText = 'Overdue';
                    statusMessage = `Payment overdue by ${status.daysUntilNext} days`;
                    break;
                case 'upcoming':
                    statusClass = 'status-paid';
                    statusText = 'Upcoming';
                    statusMessage = `Next payment in ${status.daysUntilNext} days`;
                    break;
            }

            // Create member card element directly (faster than innerHTML)
            const card = document.createElement('div');
            card.className = 'member-card';
            
            card.innerHTML = `
                <div class="member-header">
                    <span class="member-name">${member.name}</span>
                    <span class="payment-status ${statusClass}">${statusText}</span>
                </div>
                <div class="member-details">
                    <div>📅 ${new Date(member.joinDate).toLocaleDateString()}</div>
                    <div>📞 ${member.phone}</div>
                    <div>💰 $${member.monthlyFee}</div>
                    <div>${statusMessage}</div>
                    <div>Next: ${nextPayment.toLocaleDateString()}</div>
                </div>
                <div class="payment-actions">
                    ${status.status !== 'paid' ? 
                        `<button class="btn-small btn-success" onclick="academy.markAsPaid(${member.id})">✅ Paid</button>` : 
                        ''
                    }
                    ${status.status === 'overdue' || (status.status === 'pending' && status.daysUntilNext <= 1) ? 
                        `<button class="btn-small btn-warning" onclick="academy.sendWhatsAppReminder(${member.id})">📱 WhatsApp</button>` : 
                        ''
                    }
                    <button class="btn-small btn-danger" onclick="academy.removeMember(${member.id})">🗑️</button>
                </div>
            `;
            
            fragment.appendChild(card);
        });
        
        // Clear and append all at once (more efficient)
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    checkPaymentReminders() {
        const now = new Date();
        let reminders = [];

        this.members.forEach(member => {
            const status = this.getPaymentStatus(member);
            
            if (status.status === 'overdue') {
                reminders.push(`${member.name} payment is ${status.daysUntilNext} days overdue!`);
            } else if (status.status === 'pending' && status.daysUntilNext <= 1) {
                reminders.push(`${member.name} payment due ${status.daysUntilNext === 0 ? 'today' : 'tomorrow'}!`);
            }
        });

        if (reminders.length > 0) {
            this.showNotification(reminders);
        }
    }

    showNotification(reminders) {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('Payment Reminder', {
                    body: reminders.join('\n'),
                    icon: '⚽'
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('Payment Reminder', {
                            body: reminders.join('\n'),
                            icon: '⚽'
                        });
                    }
                });
            }
        }

        // Also show in console for testing
        console.log('Payment Reminders:', reminders);
        
        // Show notification to send WhatsApp messages
        if (reminders.length > 0) {
            // Create a more prominent notification
            const notificationTitle = `💰 Payment Alerts - John Zone Academy`;
            const notificationBody = `${reminders.length} members need payment reminders:\n${reminders.slice(0, 3).join('\n')}${reminders.length > 3 ? '\n...and more' : ''}`;
            
            // Show browser notification first
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notificationTitle, {
                    body: notificationBody,
                    icon: 'logo.svg',
                    badge: 'logo.svg',
                    tag: 'payment-reminders',
                    requireInteraction: true
                });
            }
            
            // Show alert with better formatting
            const shouldSend = confirm(`🚨 PAYMENT REMINDERS NEEDED\n\n${notificationBody}\n\nSend WhatsApp reminders now?`);
            if (shouldSend) {
                this.sendBulkWhatsAppReminders();
            }
        }
    }
    
    checkDailyPaymentDues() {
        const today = new Date();
        const todayStr = today.toDateString();
        const lastCheckDate = localStorage.getItem('last-daily-check');
        
        // Only check once per day
        if (lastCheckDate === todayStr) {
            return;
        }
        
        localStorage.setItem('last-daily-check', todayStr);
        
        const todayDueMembers = [];
        const overdueMembersToday = [];
        
        this.members.forEach(member => {
            const status = this.getPaymentStatus(member);
            const nextPayment = this.getNextPaymentDate(member);
            const nextPaymentStr = nextPayment.toDateString();
            
            // Check if payment is due today
            if (nextPaymentStr === todayStr && status.status !== 'paid') {
                todayDueMembers.push(member);
            }
            
            // Check if payment became overdue today
            if (status.status === 'overdue' && status.daysUntilNext === 1) {
                overdueMembersToday.push(member);
            }
        });
        
        if (todayDueMembers.length > 0 || overdueMembersToday.length > 0) {
            this.showDailyPaymentAlert(todayDueMembers, overdueMembersToday);
        }
    }
    
    showDailyPaymentAlert(todayDue, becameOverdue) {
        const today = new Date().toLocaleDateString();
        let alertMessage = `🚨 DAILY PAYMENT ALERT - ${today}\n\n`;
        
        if (todayDue.length > 0) {
            alertMessage += `💰 PAYMENTS DUE TODAY (${todayDue.length}):\n`;
            todayDue.forEach(member => {
                alertMessage += `• ${member.name} - $${member.monthlyFee} (${member.phone})\n`;
            });
            alertMessage += '\n';
        }
        
        if (becameOverdue.length > 0) {
            alertMessage += `🔴 BECAME OVERDUE TODAY (${becameOverdue.length}):\n`;
            becameOverdue.forEach(member => {
                alertMessage += `• ${member.name} - $${member.monthlyFee} (${member.phone})\n`;
            });
            alertMessage += '\n';
        }
        
        alertMessage += `📱 Action Required:\n`;
        alertMessage += `• Contact these members about their payment\n`;
        alertMessage += `• Use WhatsApp reminder buttons in the app\n\n`;
        alertMessage += `Open John Zone Academy app to send reminders?`;
        
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            const notificationTitle = `💰 Payment Alert - ${todayDue.length + becameOverdue.length} Members`;
            const notificationBody = `${todayDue.length} due today, ${becameOverdue.length} became overdue. Check the app!`;
            
            new Notification(notificationTitle, {
                body: notificationBody,
                icon: 'logo.svg',
                badge: 'logo.svg',
                tag: 'daily-payment-alert',
                requireInteraction: true,
                actions: [
                    { action: 'open', title: 'Open App' },
                    { action: 'remind-later', title: 'Remind Later' }
                ]
            });
        }
        
        // Show alert
        const shouldOpenApp = confirm(alertMessage);
        if (shouldOpenApp) {
            // Focus on the members list
            document.getElementById('members-list').scrollIntoView({ behavior: 'smooth' });
            
            // Highlight overdue members
            this.highlightDueMembers();
        }
    }
    
    highlightDueMembers() {
        // Add visual highlighting to due/overdue members for 10 seconds
        const memberCards = document.querySelectorAll('.member-card');
        memberCards.forEach(card => {
            const statusElement = card.querySelector('.payment-status');
            if (statusElement && (statusElement.classList.contains('status-overdue') || statusElement.classList.contains('status-pending'))) {
                card.style.animation = 'pulse 1s ease-in-out 3';
                card.style.border = '3px solid #ff6b6b';
                
                setTimeout(() => {
                    card.style.animation = '';
                    card.style.border = '';
                }, 10000);
            }
        });
    }

    saveMembers() {
        localStorage.setItem('academy-members', JSON.stringify(this.members));
    }

    loadMembers() {
        const saved = localStorage.getItem('academy-members');
        const members = saved ? JSON.parse(saved) : [];
        
        // Add demo member if no members exist
        if (members.length === 0) {
            const demoMember = {
                id: 999999,
                name: "Ahmed Demo",
                phone: "+96171123456",
                joinDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 35 days ago (overdue)
                monthlyFee: 40,
                payments: []
            };
            members.push(demoMember);
        }
        
        return members;
    }

    async generateReceiptImage(member, paymentDate, receiptNumber) {
        // Create canvas for receipt
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 800);
        
        // Border
        ctx.strokeStyle = '#5cb85c';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, 560, 760);
        
        // Header background
        ctx.fillStyle = '#5cb85c';
        ctx.fillRect(20, 20, 560, 120);
        
        // John Zone text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('JOHN ZONE', 300, 80);
        ctx.font = 'bold 24px Arial';
        ctx.fillText('FOOTBALL ACADEMY', 300, 110);
        
        // Receipt title
        ctx.fillStyle = '#5cb85c';
        ctx.font = 'bold 32px Arial';
        ctx.fillText('PAYMENT RECEIPT', 300, 180);
        
        // Receipt details
        ctx.fillStyle = '#333333';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        
        const details = [
            { label: 'Receipt #:', value: receiptNumber },
            { label: 'Date:', value: new Date(paymentDate).toLocaleDateString() },
            { label: 'Time:', value: new Date().toLocaleTimeString() },
            { label: '', value: '' }, // spacer
            { label: 'Member Name:', value: member.name },
            { label: 'Phone:', value: member.phone },
            { label: 'Monthly Fee:', value: `$${member.monthlyFee}` },
            { label: 'Period:', value: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
            { label: '', value: '' }, // spacer
            { label: 'AMOUNT PAID:', value: `$${member.monthlyFee}` }
        ];
        
        let yPos = 230;
        details.forEach(detail => {
            if (detail.label === '' && detail.value === '') {
                yPos += 20;
                return;
            }
            
            if (detail.label === 'AMOUNT PAID:') {
                ctx.font = 'bold 28px Arial';
                ctx.fillStyle = '#5cb85c';
            } else {
                ctx.font = '20px Arial';
                ctx.fillStyle = '#333333';
            }
            
            ctx.fillText(detail.label, 60, yPos);
            ctx.fillText(detail.value, 250, yPos);
            yPos += 35;
        });
        
        // Payment confirmed
        yPos += 30;
        ctx.fillStyle = '#28a745';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('✅ PAYMENT CONFIRMED', 300, yPos);
        
        // Thank you message
        yPos += 50;
        ctx.fillStyle = '#333333';
        ctx.font = '18px Arial';
        ctx.fillText('Thank you for your payment!', 300, yPos);
        
        // Footer
        yPos += 80;
        ctx.fillStyle = '#5cb85c';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('John Zone Football Academy', 300, yPos);
        yPos += 30;
        ctx.font = '16px Arial';
        ctx.fillText('Building Champions, Creating Futures', 300, yPos);
        
        return canvas.toDataURL('image/png');
    }
    
    async sendReceiptViaWhatsApp(member, paymentDate, receiptNumber) {
        try {
            // Generate receipt image
            const receiptImageData = await this.generateReceiptImage(member, paymentDate, receiptNumber);
            
            // Create download link for the receipt
            const link = document.createElement('a');
            link.download = `Receipt_${member.name}_${receiptNumber}.png`;
            link.href = receiptImageData;
            link.click();
            
            // Simple message for WhatsApp (since we can't send images directly via URL)
            const message = `🧾 Payment Receipt from John Zone Football Academy
            
Receipt #: ${receiptNumber}
Member: ${member.name}
Amount: $${member.monthlyFee}
Date: ${new Date(paymentDate).toLocaleDateString()}

✅ Payment Confirmed
Thank you for your payment!

📷 Receipt image downloaded to your device - please attach it to this WhatsApp conversation.`;
            
            const phoneNumber = member.phone.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            
            window.open(whatsappUrl, '_blank');
            
        } catch (error) {
            console.error('Error generating receipt:', error);
            // Fallback to text receipt
            const receiptMessage = `🧾 JOHN ZONE FOOTBALL ACADEMY - RECEIPT

Receipt #: ${receiptNumber}
Date: ${new Date(paymentDate).toLocaleDateString()}
Member: ${member.name}
Amount Paid: $${member.monthlyFee}

✅ Payment Confirmed
Thank you!`;

            const phoneNumber = member.phone.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(receiptMessage)}`;
            
            window.open(whatsappUrl, '_blank');
        }
    }

    sendWhatsAppReminder(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return;
        
        const status = this.getPaymentStatus(member);
        let message = '';
        
        if (status.status === 'overdue') {
            message = `Hello! This is from John Zone Football Academy. You have an overdue payment of $${member.monthlyFee}. Payment was due ${status.daysUntilNext} days ago. Please settle your payment as soon as possible. Thank you!`;
        } else {
            message = `Hello! This is from John Zone Football Academy. Your payment of $${member.monthlyFee} is due ${status.daysUntilNext === 0 ? 'today' : 'tomorrow'}. Please make your payment on time. Thank you!`;
        }
        
        const phoneNumber = member.phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
    }
    
    sendBulkWhatsAppReminders() {
        const overdueMembers = this.members.filter(member => {
            const status = this.getPaymentStatus(member);
            return status.status === 'overdue' || (status.status === 'pending' && status.daysUntilNext <= 1);
        });
        
        // Send messages with delay to avoid overwhelming the phone
        overdueMembers.forEach((member, index) => {
            setTimeout(() => {
                this.sendWhatsAppReminder(member.id);
            }, index * 2000); // 2 second delay between each message
        });
    }
    
    sendReceiptViaWhatsApp(member, paymentDate, receiptNumber) {
        const receiptText = `🧾 *JOHN ZONE FOOTBALL ACADEMY*
*PAYMENT RECEIPT*

📋 Receipt #: ${receiptNumber}
📅 Date: ${new Date(paymentDate).toLocaleDateString()}
⏰ Time: ${new Date().toLocaleTimeString()}

👤 *Member Details:*
Name: ${member.name}
Phone: ${member.phone}
Join Date: ${new Date(member.joinDate).toLocaleDateString()}

💰 *Payment Details:*
Description: Monthly Training Fee
Period: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
*Amount Paid: $${member.monthlyFee}*

✅ Payment Status: PAID
Thank you for your payment!

⚽ John Zone Football Academy
Building Champions, Creating Futures`;

        const phoneNumber = member.phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(receiptText)}`;
        
        // Auto-open WhatsApp with receipt
        window.open(whatsappUrl, '_blank');
    }

    generateReceipt(member, paymentDate) {
        const receiptContent = `
            <div style="max-width: 400px; margin: 20px auto; padding: 20px; border: 2px solid #5cb85c; font-family: Arial, sans-serif;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="logo.svg" style="height: 60px; margin-bottom: 10px;">
                    <h2 style="color: #5cb85c; margin: 0;">JOHN ZONE FOOTBALL ACADEMY</h2>
                    <h3 style="color: #333; margin: 5px 0;">PAYMENT RECEIPT</h3>
                </div>
                
                <hr style="border: 1px solid #5cb85c; margin: 20px 0;">
                
                <div style="margin: 15px 0;">
                    <strong>Receipt #:</strong> JZ-${Date.now()}<br>
                    <strong>Date:</strong> ${new Date(paymentDate).toLocaleDateString()}<br>
                    <strong>Time:</strong> ${new Date().toLocaleTimeString()}
                </div>
                
                <hr style="border: 1px solid #ddd; margin: 20px 0;">
                
                <div style="margin: 15px 0;">
                    <strong>Member Name:</strong> ${member.name}<br>
                    <strong>Phone:</strong> ${member.phone}<br>
                    <strong>Join Date:</strong> ${new Date(member.joinDate).toLocaleDateString()}
                </div>
                
                <hr style="border: 1px solid #ddd; margin: 20px 0;">
                
                <div style="margin: 15px 0;">
                    <strong>Description:</strong> Monthly Training Fee<br>
                    <strong>Period:</strong> ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}<br>
                    <strong style="font-size: 18px; color: #5cb85c;">Amount Paid: $${member.monthlyFee}</strong>
                </div>
                
                <hr style="border: 1px solid #5cb85c; margin: 20px 0;">
                
                <div style="text-align: center; font-size: 12px; color: #666;">
                    <p>Thank you for your payment!</p>
                    <p>John Zone Football Academy<br>
                    Building Champions, Creating Futures</p>
                </div>
            </div>
        `;
        
        const receiptWindow = window.open('', '_blank');
        receiptWindow.document.write(`
            <html>
                <head>
                    <title>Receipt - ${member.name}</title>
                </head>
                <body style="margin: 0; padding: 20px; background: #f5f5f5;">
                    ${receiptContent}
                    <div style="text-align: center; margin: 20px;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #5cb85c; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer;">🖨️ Print Receipt</button>
                        <button onclick="navigator.share({title: 'Payment Receipt', text: 'Payment receipt for John Zone Football Academy'})" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin-left: 10px;">📤 Share</button>
                    </div>
                </body>
            </html>
        `);
        receiptWindow.document.close();
    }
}

// Initialize the app
const academy = new FootballAcademy();

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}