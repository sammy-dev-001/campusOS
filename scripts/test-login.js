const fetch = require('node-fetch');
const { API_BASE_URL } = require('./constants/Config');


async function testLogin() {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john@example.com', password: 'password123' })
    });

    const data = await response.json();
    console.log('Login response:', data);
  } catch (error) {
    console.error('Error in test login:', error);
  }
}

// Run the test
// testLogin();
