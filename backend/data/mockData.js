// Mock data for dashboard statistics
const dashboardData = {
  stats: {
    revenue: {
      value: 48574,
      label: 'Total Revenue',
      trend: 12.5,
      comparison: 'vs $43,182 last month'
    },
    bookings: {
      value: 1284,
      label: 'Active Bookings',
      trend: 8.2,
      comparison: '142 pending confirmation'
    },
    users: {
      value: 3842,
      label: 'Total Users',
      trend: 24.3,
      comparison: '287 new this month'
    },
    rating: {
      value: 4.8,
      label: 'Avg. Rating',
      trend: 0.3,
      comparison: 'Based on 1,247 reviews'
    }
  }
};

// Services data
const services = [
  {
    id: 'SRV-001',
    name: 'Strategy Consultation',
    category: 'Consulting',
    duration: 60,
    price: 150.00,
    bookings: 234,
    trend: 12,
    status: 'active',
    icon: 'consultation'
  },
  {
    id: 'SRV-002',
    name: 'Team Workshop',
    category: 'Training',
    duration: 180,
    price: 450.00,
    bookings: 89,
    trend: 8,
    status: 'active',
    icon: 'workshop'
  },
  {
    id: 'SRV-003',
    name: 'Process Audit',
    category: 'Assessment',
    duration: 120,
    price: 275.00,
    bookings: 156,
    trend: -3,
    status: 'paused',
    icon: 'audit'
  },
  {
    id: 'SRV-004',
    name: 'Executive Coaching',
    category: 'Premium',
    duration: 90,
    price: 350.00,
    bookings: 67,
    trend: 18,
    status: 'active',
    icon: 'premium'
  },
  {
    id: 'SRV-005',
    name: 'Technical Review',
    category: 'Assessment',
    duration: 90,
    price: 225.00,
    bookings: 112,
    trend: 5,
    status: 'active',
    icon: 'audit'
  },
  {
    id: 'SRV-006',
    name: 'Onboarding Session',
    category: 'Training',
    duration: 45,
    price: 100.00,
    bookings: 298,
    trend: 22,
    status: 'active',
    icon: 'workshop'
  },
  {
    id: 'SRV-007',
    name: 'AI Haircut',
    category: 'Beauty',
    duration: 60,
    price: 85.00,
    bookings: 187,
    trend: 15,
    status: 'active',
    icon: 'haircut',
    imageQuery: 'AI haircut salon hair styling'
  },
  {
    id: 'SRV-008',
    name: 'Private Tutor',
    category: 'Education',
    duration: 90,
    price: 120.00,
    bookings: 143,
    trend: 10,
    status: 'active',
    icon: 'tutor',
    imageQuery: 'private tutor teaching education'
  },
  {
    id: 'SRV-009',
    name: 'Car Wash',
    category: 'Automotive',
    duration: 30,
    price: 45.00,
    bookings: 321,
    trend: 20,
    status: 'active',
    icon: 'carwash',
    imageQuery: 'car wash cleaning service'
  }
];

// Bookings data
const bookings = [
  {
    id: 'BKG-001',
    serviceId: 'SRV-001',
    serviceName: 'Strategy Consultation',
    clientName: 'Michael Chen',
    clientEmail: 'michael.chen@example.com',
    date: '2026-01-31',
    time: '09:00',
    duration: 60,
    status: 'confirmed'
  },
  {
    id: 'BKG-002',
    serviceId: 'SRV-004',
    serviceName: 'Executive Coaching',
    clientName: 'Sarah Williams',
    clientEmail: 'sarah.williams@example.com',
    date: '2026-01-31',
    time: '10:30',
    duration: 90,
    status: 'confirmed'
  },
  {
    id: 'BKG-003',
    serviceId: 'SRV-002',
    serviceName: 'Team Workshop',
    clientName: 'Acme Corp Team',
    clientEmail: 'booking@acmecorp.com',
    date: '2026-01-31',
    time: '14:00',
    duration: 180,
    status: 'pending'
  },
  {
    id: 'BKG-004',
    serviceId: 'SRV-001',
    serviceName: 'Strategy Consultation',
    clientName: 'James Peterson',
    clientEmail: 'james.peterson@example.com',
    date: '2026-01-31',
    time: '17:30',
    duration: 60,
    status: 'confirmed'
  },
  {
    id: 'BKG-005',
    serviceId: 'SRV-003',
    serviceName: 'Process Audit',
    clientName: 'Tech Solutions Inc',
    clientEmail: 'audit@techsolutions.com',
    date: '2026-02-01',
    time: '10:00',
    duration: 120,
    status: 'confirmed'
  },
  {
    id: 'BKG-006',
    serviceId: 'SRV-002',
    serviceName: 'Team Workshop',
    clientName: 'Global Dynamics',
    clientEmail: 'training@globaldynamics.com',
    date: '2026-02-03',
    time: '09:00',
    duration: 180,
    status: 'pending'
  }
];

// Calendar bookings by date
const calendarBookings = {
  '2026-01-05': 1,
  '2026-01-06': 2,
  '2026-01-08': 1,
  '2026-01-12': 3,
  '2026-01-14': 1,
  '2026-01-19': 2,
  '2026-01-20': 1,
  '2026-01-22': 1,
  '2026-01-26': 2,
  '2026-01-31': 3
};

// Payments data
const payments = [
  {
    id: 'TXN-78432',
    customerId: 'USR-001',
    customerName: 'Michael Chen',
    customerInitials: 'MC',
    service: 'Strategy Consultation',
    date: '2026-01-31',
    amount: 150.00,
    status: 'completed'
  },
  {
    id: 'TXN-78431',
    customerId: 'USR-002',
    customerName: 'Sarah Williams',
    customerInitials: 'SW',
    service: 'Executive Coaching',
    date: '2026-01-31',
    amount: 350.00,
    status: 'completed'
  },
  {
    id: 'TXN-78430',
    customerId: 'USR-003',
    customerName: 'Acme Corp',
    customerInitials: 'AC',
    service: 'Team Workshop',
    date: '2026-01-30',
    amount: 450.00,
    status: 'pending'
  },
  {
    id: 'TXN-78429',
    customerId: 'USR-004',
    customerName: 'James Peterson',
    customerInitials: 'JP',
    service: 'Process Audit',
    date: '2026-01-29',
    amount: 275.00,
    status: 'completed'
  },
  {
    id: 'TXN-78428',
    customerId: 'USR-005',
    customerName: 'Emily Johnson',
    customerInitials: 'EJ',
    service: 'Strategy Consultation',
    date: '2026-01-28',
    amount: 150.00,
    status: 'refunded'
  },
  {
    id: 'TXN-78427',
    customerId: 'USR-006',
    customerName: 'Robert Davis',
    customerInitials: 'RD',
    service: 'Executive Coaching',
    date: '2026-01-27',
    amount: 350.00,
    status: 'completed'
  },
  {
    id: 'TXN-78426',
    customerId: 'USR-007',
    customerName: 'Lisa Anderson',
    customerInitials: 'LA',
    service: 'Technical Review',
    date: '2026-01-26',
    amount: 225.00,
    status: 'completed'
  }
];

// Users data
const users = [
  {
    id: 'USR-001',
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    initials: 'MC',
    role: 'customer',
    joinDate: '2025-06-15',
    totalBookings: 12,
    totalSpent: 1800.00
  },
  {
    id: 'USR-002',
    name: 'Sarah Williams',
    email: 'sarah.williams@example.com',
    initials: 'SW',
    role: 'customer',
    joinDate: '2025-08-22',
    totalBookings: 8,
    totalSpent: 2800.00
  },
  {
    id: 'USR-003',
    name: 'Acme Corp',
    email: 'booking@acmecorp.com',
    initials: 'AC',
    role: 'business',
    joinDate: '2025-03-10',
    totalBookings: 24,
    totalSpent: 10800.00
  },
  {
    id: 'USR-ADMIN',
    name: 'Arpit Yadav',
    email: 'arpit@flowgrid.com',
    initials: 'AY',
    role: 'admin',
    joinDate: '2025-01-01',
    totalBookings: 0,
    totalSpent: 0
  }
];
// Current user (admin)
const currentUser = {
  id: 'USR-ADMIN',
  name: 'Arpit Yadav',
  email: 'arpit@flowgrid.com',
  initials: 'AY',
  role: 'Administrator',
  avatar: null
};

module.exports = {
  dashboardData,
  services,
  bookings,
  calendarBookings,
  payments,
  users,
  currentUser
};
