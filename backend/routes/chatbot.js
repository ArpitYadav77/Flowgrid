const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Salon details
const salonDetails = {
  name: "Priya's Beauty Salon",
  rating: 4.8,
  reviewsCount: 287,
  location: 'Local City Center',
  status: 'Available Now'
};

// Available services
const availableServices = [
  {
    id: 'SRV-HAIRCUT-001',
    name: 'Haircut',
    price: 299,
    duration: 30,
    description: 'Professional haircut by experienced stylists',
    category: 'salon',
    providerId: 'USR-SALON-01',
    providerName: "Priya's Beauty Salon",
    currency: 'INR',
    status: 'active'
  },
  {
    id: 'SRV-BEARD-001',
    name: 'Beard Trim',
    price: 149,
    duration: 20,
    description: 'Precise beard trimming and styling',
    category: 'salon',
    providerId: 'USR-SALON-01',
    providerName: "Priya's Beauty Salon",
    currency: 'INR',
    status: 'active'
  },
  {
    id: 'SRV-FACIAL-001',
    name: 'Facial Treatment',
    price: 599,
    duration: 45,
    description: 'Skin rejuvenation and glow treatment',
    category: 'salon',
    providerId: 'USR-SALON-01',
    providerName: "Priya's Beauty Salon",
    currency: 'INR',
    status: 'active'
  }
];

// Available time slots
const timeSlots = [
  '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00'
];

// Store chat sessions
let chatSessions = {};

// Intent detection function
function detectIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  // Service intents
  if (lowerMsg.includes('haircut') || lowerMsg.includes('hair cut')) return { intent: 'service_haircut', service: 'Haircut' };
  if (lowerMsg.includes('beard') || lowerMsg.includes('shave')) return { intent: 'service_beard', service: 'Beard Trim' };
  if (lowerMsg.includes('facial') || lowerMsg.includes('face')) return { intent: 'service_facial', service: 'Facial Treatment' };
  
  // General intents
  if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('how much')) return { intent: 'price_inquiry' };
  if (lowerMsg.includes('time') || lowerMsg.includes('duration') || lowerMsg.includes('how long')) return { intent: 'duration_inquiry' };
  if (lowerMsg.includes('book') || lowerMsg.includes('appointment') || lowerMsg.includes('schedule')) return { intent: 'booking' };
  if (lowerMsg.includes('available') || lowerMsg.includes('availability') || lowerMsg.includes('slot')) return { intent: 'availability' };
  if (lowerMsg.includes('combo') || lowerMsg.includes('package') || lowerMsg.includes('together')) return { intent: 'combo_request' };
  if (lowerMsg.includes('cancel')) return { intent: 'cancel' };
  if (lowerMsg.includes('reschedule') || lowerMsg.includes('change')) return { intent: 'reschedule' };
  if (lowerMsg.includes('owner') || lowerMsg.includes('manager') || lowerMsg.includes('talk to')) return { intent: 'talk_to_owner' };
  if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) return { intent: 'greeting' };
  if (lowerMsg.includes('help') || lowerMsg.includes('service')) return { intent: 'help' };
  
  // Date detection
  if (lowerMsg.includes('today') || lowerMsg.includes('tomorrow') || lowerMsg.match(/\d{4}-\d{2}-\d{2}/)) return { intent: 'date_selection' };
  
  // Time detection
  if (lowerMsg.match(/\d{1,2}:\d{2}/) || lowerMsg.match(/\d{1,2}\s*(am|pm)/i)) return { intent: 'time_selection' };
  
  // Confirmation
  if (lowerMsg.includes('yes') || lowerMsg.includes('ok') || lowerMsg.includes('sure') || lowerMsg.includes('confirm')) return { intent: 'confirm' };
  if (lowerMsg.includes('no') || lowerMsg.includes('not')) return { intent: 'decline' };
  
  return { intent: 'unknown' };
}

// Get or create chat session
function getSession(userId) {
  if (!chatSessions[userId]) {
    chatSessions[userId] = {
      cart: [],
      step: 'initial',
      selectedDate: null,
      selectedTime: null,
      awaitingResponse: null
    };
  }
  return chatSessions[userId];
}

// Calculate total price
function calculateTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price, 0);
}

// Generate chatbot response
function generateResponse(userId, message, intent) {
  const session = getSession(userId);
  const { cart, step, awaitingResponse } = session;

  // Greeting
  if (intent.intent === 'greeting') {
    return {
      message: `Hello! Welcome to ${salonDetails.name}. How can I help you today? We offer Haircut (₹299), Beard Trim (₹149), and Facial Treatment (₹599).`,
      options: ['Book Haircut', 'Book Beard Trim', 'Book Facial', 'View All Services']
    };
  }

  // Help
  if (intent.intent === 'help') {
    return {
      message: `I can help you with:\n\n1. Haircut - ₹299 (30 min)\n2. Beard Trim - ₹149 (20 min)\n3. Facial Treatment - ₹599 (45 min)\n\nWhat would you like to book?`,
      options: ['Haircut', 'Beard Trim', 'Facial Treatment']
    };
  }

  // Service selection
  if (intent.intent.startsWith('service_')) {
    const service = availableServices.find(s => s.name === intent.service);
    if (service) {
      // Check if already in cart
      const alreadyInCart = cart.some(item => item.id === service.id);
      if (!alreadyInCart) {
        session.cart.push(service);
      }
      
      const total = calculateTotal(session.cart);
      let response = `${service.name} added! Price: ₹${service.price}, Duration: ${service.duration} min.\n\nCurrent total: ₹${total}`;
      
      // Suggest upsell
      let options = ['Proceed to booking'];
      if (service.name === 'Haircut' && !cart.some(item => item.name === 'Beard Trim')) {
        response += `\n\nWould you like to add a Beard Trim for just ₹149?`;
        options.unshift('Add Beard Trim');
      }
      
      session.step = 'cart_review';
      session.awaitingResponse = 'add_more_or_proceed';
      
      return { message: response, options };
    }
  }

  // Price inquiry
  if (intent.intent === 'price_inquiry') {
    return {
      message: `Our services:\n\n• Haircut - ₹299\n• Beard Trim - ₹149\n• Facial Treatment - ₹599\n\nWhich one would you like to book?`,
      options: ['Book Haircut', 'Book Beard Trim', 'Book Facial']
    };
  }

  // Duration inquiry
  if (intent.intent === 'duration_inquiry') {
    return {
      message: `Service durations:\n\n• Haircut - 30 minutes\n• Beard Trim - 20 minutes\n• Facial Treatment - 45 minutes`,
      options: ['Book Now']
    };
  }

  // Booking / Availability
  if (intent.intent === 'booking' || intent.intent === 'availability') {
    if (cart.length === 0) {
      return {
        message: `Please select a service first. What would you like to book?`,
        options: ['Haircut', 'Beard Trim', 'Facial Treatment']
      };
    }
    
    session.step = 'date_selection';
    session.awaitingResponse = 'date';
    return {
      message: `Great! When would you like to come in?`,
      options: ['Today', 'Tomorrow', 'Choose Date']
    };
  }

  // Date selection
  if (step === 'date_selection' || intent.intent === 'date_selection') {
    const today = new Date();
    let selectedDate;
    
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('today')) {
      selectedDate = today.toISOString().split('T')[0];
    } else if (lowerMsg.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      selectedDate = tomorrow.toISOString().split('T')[0];
    } else {
      // Extract date from message
      const match = message.match(/\d{4}-\d{2}-\d{2}/);
      if (match) {
        selectedDate = match[0];
      }
    }
    
    if (selectedDate) {
      session.selectedDate = selectedDate;
      session.step = 'time_selection';
      session.awaitingResponse = 'time';
      
      return {
        message: `Perfect! What time works for you on ${selectedDate}?`,
        options: ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '04:00 PM'],
        showAllSlots: true,
        allSlots: timeSlots
      };
    }
  }

  // Time selection
  if (step === 'time_selection' || intent.intent === 'time_selection') {
    const timeMatch = message.match(/\d{1,2}:\d{2}/);
    if (timeMatch) {
      session.selectedTime = timeMatch[0];
      session.step = 'confirmation';
      session.awaitingResponse = 'confirm_booking';
      
      const total = calculateTotal(cart);
      const totalDuration = cart.reduce((sum, item) => sum + item.duration, 0);
      
      let summary = `📋 Booking Summary:\n\n`;
      cart.forEach(item => {
        summary += `• ${item.name} - ₹${item.price} (${item.duration} min)\n`;
      });
      summary += `\n📅 Date: ${session.selectedDate}\n⏰ Time: ${session.selectedTime}\n⏱️ Total Duration: ${totalDuration} min\n💰 Total Amount: ₹${total}\n\nConfirm booking?`;
      
      return {
        message: summary,
        options: ['Confirm & Pay', 'Change Time', 'Cancel']
      };
    }
  }

  // Confirmation
  if (intent.intent === 'confirm' && step === 'confirmation') {
    const total = calculateTotal(cart);
    session.step = 'payment';
    
    return {
      message: `Excellent! Please proceed to payment of ₹${total} to confirm your booking.\n\nYour booking is reserved for ${session.selectedDate} at ${session.selectedTime}.`,
      requiresPayment: true,
      bookingDetails: {
        services: cart,
        date: session.selectedDate,
        time: session.selectedTime,
        total: total
      }
    };
  }

  // Talk to owner
  if (intent.intent === 'talk_to_owner') {
    return {
      message: `Connecting you with the salon owner. Please wait...`,
      transferToOwner: true
    };
  }

  // Combo request
  if (intent.intent === 'combo_request') {
    return {
      message: `Great choice! Our popular combo:\n\nHaircut + Beard Trim = ₹448 (Save ₹50!)\n\nRegular price: ₹498\nCombo price: ₹448\n\nWould you like this combo?`,
      options: ['Yes, book combo', 'No, individual services']
    };
  }

  // Unknown intent
  return {
    message: `I'm here to help you book services at ${salonDetails.name}. You can book:\n\n• Haircut (₹299)\n• Beard Trim (₹149)\n• Facial Treatment (₹599)\n\nWhat would you like?`,
    options: ['View Services', 'Book Haircut', 'Book Beard Trim']
  };
}

// POST /api/chatbot/message
router.post('/message', authenticateToken, (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const intent = detectIntent(message);
  const response = generateResponse(userId, message, intent);

  res.json({
    success: true,
    userMessage: message,
    botResponse: response,
    session: getSession(userId)
  });
});

// GET /api/chatbot/session
router.get('/session', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const session = getSession(userId);

  res.json({
    success: true,
    session
  });
});

// POST /api/chatbot/reset
router.post('/reset', authenticateToken, (req, res) => {
  const userId = req.user.id;
  chatSessions[userId] = {
    cart: [],
    step: 'initial',
    selectedDate: null,
    selectedTime: null,
    awaitingResponse: null
  };

  res.json({
    success: true,
    message: 'Chat session reset'
  });
});

// GET /api/chatbot/services
router.get('/services', (req, res) => {
  res.json({
    success: true,
    salon: salonDetails,
    services: availableServices
  });
});

module.exports = router;
