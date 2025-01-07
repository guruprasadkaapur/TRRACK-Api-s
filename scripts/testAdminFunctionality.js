import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:8000/api';
let authToken = '';
let userId = '';

const testAdminFunctionality = async () => {
  try {
    console.log('Starting Admin Functionality Tests...\n');

    // 1. Login as admin
    console.log('1. Login as admin...');
    const loginRes = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '9999888877',
        deviceInfo: {
          deviceId: 'test-device-001',
          deviceType: 'test',
          deviceName: 'Test Device'
        }
      })
    });
    
    if (!loginRes.ok) throw new Error('Login failed');
    const loginData = await loginRes.json();
    console.log('Login successful, OTP sent\n');

    // Simulate OTP verification (you'll need to input the actual OTP)
    const otp = await promptOTP();
    const verifyRes = await fetch(`${BASE_URL}/users/verify-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '9999888877',
        otp,
        deviceInfo: {
          deviceId: 'test-device-001',
          deviceType: 'test',
          deviceName: 'Test Device'
        }
      })
    });

    if (!verifyRes.ok) throw new Error('OTP verification failed');
    const verifyData = await verifyRes.json();
    authToken = verifyData.token;
    console.log('OTP verified, got auth token\n');

    // 2. Test Get All Users
    console.log('2. Testing Get All Users...');
    const usersRes = await fetch(`${BASE_URL}/admins/users`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Device-Id': 'test-device-001'
      }
    });
    
    if (!usersRes.ok) throw new Error('Get users failed');
    const users = await usersRes.json();
    console.log(`Found ${users.length} users\n`);

    // Save a non-admin user ID for later tests
    const regularUser = users.find(u => u.role !== 'admin');
    if (regularUser) userId = regularUser._id;

    // 3. Test Get All Licenses
    console.log('3. Testing Get All Licenses...');
    const licensesRes = await fetch(`${BASE_URL}/admins/licenses`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Device-Id': 'test-device-001'
      }
    });
    
    if (!licensesRes.ok) throw new Error('Get licenses failed');
    const licenses = await licensesRes.json();
    console.log(`Found ${licenses.length} licenses\n`);

    // 4. Test Managing User Device Mode
    if (userId) {
      console.log('4. Testing User Device Mode Management...');
      const deviceModeRes = await fetch(`${BASE_URL}/admins/users/${userId}/device-mode`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Device-Id': 'test-device-001',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          singleDeviceMode: true
        })
      });
      
      if (!deviceModeRes.ok) throw new Error('Update device mode failed');
      const deviceModeData = await deviceModeRes.json();
      console.log('Successfully updated user device mode\n');
    }

    // 5. Test Make User Admin
    if (userId) {
      console.log('5. Testing Make User Admin...');
      const makeAdminRes = await fetch(`${BASE_URL}/admins/users/${userId}/make-admin`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Device-Id': 'test-device-001'
        }
      });
      
      if (!makeAdminRes.ok) throw new Error('Make admin failed');
      const makeAdminData = await makeAdminRes.json();
      console.log('Successfully made user an admin\n');
    }

    console.log('All admin functionality tests completed successfully!');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

// Helper function to prompt for OTP
const promptOTP = () => {
  return new Promise((resolve) => {
    console.log('Please check your phone and enter the OTP:');
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
};

testAdminFunctionality();
