class FootballAcademy {
    constructor() {
        // Simple password protection
        this.checkAccess();
        this.members = this.loadMembers();
        this.init();
    }

    checkAccess() {
        const password = localStorage.getItem('academy-password');
        if (!password) {
            const userPassword = prompt('Enter password to access Football Academy:');
            if (userPassword !== 'academy123') {
                alert('Wrong password! Access denied.');
                document.body.innerHTML = '<div style="text-align:center;margin-top:50px;font-family:Arial;"><h1>🚫 Access Denied</h1><p>Contact the administrator for access.</p></div>';
                return;
            }
            localStorage.setItem('academy-password', 'verified');
        }
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.checkPaymentReminders();
        
        // Check for reminders every hour
        setInterval(() => {
            this.checkPaymentReminders();
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
            member.payments.push({
                date: paymentDate,
                amount: member.monthlyFee
            });
            this.saveMembers();
            this.updateDisplay();
            
            // Generate and send receipt
            this.generateReceipt(member, paymentDate);
            alert(`Payment recorded for ${member.name}. Receipt ready!`);
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

        container.innerHTML = this.members.map(member => {
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

            return `
                <div class="member-card">
                    <div class="member-header">
                        <span class="member-name">${member.name}</span>
                        <span class="payment-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="member-details">
                        <div>📅 Joined: ${new Date(member.joinDate).toLocaleDateString()}</div>
                        <div>📞 Phone: ${member.phone}</div>
                        <div>💰 Monthly Fee: $${member.monthlyFee}</div>
                        <div>📋 ${statusMessage}</div>
                        <div>🗓️ Next Payment: ${nextPayment.toLocaleDateString()}</div>
                    </div>
                    <div class="payment-actions">
                        ${status.status !== 'paid' ? 
                            `<button class="btn-small btn-success" onclick="academy.markAsPaid(${member.id})">Mark as Paid</button>` : 
                            ''
                        }
                        ${status.status === 'overdue' || (status.status === 'pending' && status.daysUntilNext <= 1) ? 
                            `<button class="btn-small btn-warning" onclick="academy.sendWhatsAppReminder(${member.id})">💬 WhatsApp Reminder</button>` : 
                            ''
                        }
                        <button class="btn-small btn-danger" onclick="academy.removeMember(${member.id})">Remove</button>
                    </div>
                </div>
            `;
        }).join('');
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
            const shouldSend = confirm(`${reminders.length} members need payment reminders. Send WhatsApp notifications now?`);
            if (shouldSend) {
                this.sendBulkWhatsAppReminders();
            }
        }
    }

    saveMembers() {
        localStorage.setItem('academy-members', JSON.stringify(this.members));
    }

    loadMembers() {
        const saved = localStorage.getItem('academy-members');
        return saved ? JSON.parse(saved) : [];
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
        this.members.forEach(member => {
            const status = this.getPaymentStatus(member);
            if (status.status === 'overdue' || (status.status === 'pending' && status.daysUntilNext <= 1)) {
                setTimeout(() => {
                    this.sendWhatsAppReminder(member.id);
                }, 1000);
            }
        });
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