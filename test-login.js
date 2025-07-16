// Simple test script to test login functionality
import fetch from 'node-fetch';

const testLogin = async () => {
  try {
    console.log('🧪 Testing login API...');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'pasu',
        password: '123'
      })
    });

    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📄 Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Login successful!');
      console.log('🔑 Token:', data.token);
    } else {
      console.log('❌ Login failed:', data.message);
    }
    
  } catch (error) {
    console.error('🚨 Error testing login:', error.message);
  }
};

// Test health endpoint first
const testHealth = async () => {
  try {
    console.log('🏥 Testing health endpoint...');
    
    const response = await fetch('http://localhost:3001/health');
    const data = await response.json();
    
    console.log('📊 Health Status:', response.status);
    console.log('📄 Health Data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('🚨 Error testing health:', error.message);
  }
};

// Run tests
console.log('🚀 Starting API tests...\n');

testHealth().then(() => {
  console.log('\n' + '='.repeat(50) + '\n');
  return testLogin();
}).then(() => {
  console.log('\n✅ Tests completed!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
}); 