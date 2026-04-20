class FootballAcademy {
    constructor() {
        this.members = this.loadMembers();
        this.init();
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
        const joinDate = document.getElementById('join-date').value;
        const monthlyFee = parseFloat(document.getElementById('monthly-fee').value);

        if (!name || !joinDate || !monthlyFee) {
            alert('Please fill all fields');
            return;
        }

        const member = {
            id: Date.now(),
            name: name,
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
            member.payments.push({
                date: new Date().toISOString().split('T')[0],
                amount: member.monthlyFee
            });
            this.saveMembers();
            this.updateDisplay();
            alert(`Payment recorded for ${member.name}`);
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
                        <div>💰 Monthly Fee: $${member.monthlyFee}</div>
                        <div>📋 ${statusMessage}</div>
                        <div>🗓️ Next Payment: ${nextPayment.toLocaleDateString()}</div>
                    </div>
                    <div class="payment-actions">
                        ${status.status !== 'paid' ? 
                            `<button class="btn-small btn-success" onclick="academy.markAsPaid(${member.id})">Mark as Paid</button>` : 
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
    }

    saveMembers() {
        localStorage.setItem('academy-members', JSON.stringify(this.members));
    }

    loadMembers() {
        const saved = localStorage.getItem('academy-members');
        return saved ? JSON.parse(saved) : [];
    }
}

// Initialize the app
const academy = new FootballAcademy();

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}