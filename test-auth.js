const fetch = require('node-fetch');
const API_BASE_URL = 'http://172.26.95.216:3001';

// Test user credentials
const testUser = {
  email: 'john@example.com',
  password: 'password123'
};

async function testAuth() {
  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    const data = await res.json();
    console.log('Auth response:', data);
  } catch (error) {
    console.error('Error in test auth:', error);
  }
}

// testAuth();
