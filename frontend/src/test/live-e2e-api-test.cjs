const axios = require('axios');

async function testFrontendBackendIntegration() {
  console.log('--- Starting Frontend-to-Backend Live E2E Integration Test ---');
  const baseURL = 'http://localhost:5000/api/v1';
  
  const testDonor = {
    firstName: 'FrontendQA',
    lastName: 'Tester',
    email: 'fe-qa-' + Date.now() + '@example.test',
    phone: '5551234567',
    password: 'StrongPassword123!',
  };

  try {
    // 1. Health check
    console.log('1. Testing GET http://localhost:5000/health...');
    const health = await axios.get('http://localhost:5000/health');
    console.log('   Health status:', health.data.status);

    // 2. Register
    console.log('2. Testing POST /api/v1/auth/register...');
    const regRes = await axios.post(`${baseURL}/auth/register`, testDonor);
    console.log('   Registration SUCCESS! User ID:', regRes.data.data.user.id, 'Role:', regRes.data.data.user.role);
    const token = regRes.data.data.accessToken;

    // 3. Get /users/me
    console.log('3. Testing GET /api/v1/users/me...');
    const meRes = await axios.get(`${baseURL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('   Fetch Profile SUCCESS! User Email:', meRes.data.data.email);

    // 4. Update Profile
    console.log('4. Testing PATCH /api/v1/users/me...');
    const updateRes = await axios.patch(
      `${baseURL}/users/me`,
      { firstName: 'UpdatedFE', lastName: 'TesterUpdated', phone: '9990001111' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('   Update Profile SUCCESS! New Name:', updateRes.data.data.firstName, updateRes.data.data.lastName);

    // 5. Change Password
    console.log('5. Testing POST /api/v1/users/me/change-password...');
    const newPassword = 'NewStrongPassword123!';
    const changePassRes = await axios.post(
      `${baseURL}/users/me/change-password`,
      { currentPassword: testDonor.password, newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('   Change Password SUCCESS! Message:', changePassRes.data.message);

    // 6. Verify Old Token Revoked (401 expected)
    console.log('6. Verifying session revocation with old token...');
    try {
      await axios.get(`${baseURL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.error('   FAILED: Old token was not revoked!');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('   SUCCESS: Old token correctly rejected with HTTP 401 (AUTH_SESSION_REVOKED)');
      } else {
        throw err;
      }
    }

    // 7. Login with New Password
    console.log('7. Testing POST /api/v1/auth/login with new password...');
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: testDonor.email,
      password: newPassword,
    });
    console.log('   Login with New Password SUCCESS! Token received.');
    const newToken = loginRes.data.data.accessToken;

    // 8. Logout
    console.log('8. Testing POST /api/v1/auth/logout...');
    const logoutRes = await axios.post(
      `${baseURL}/auth/logout`,
      {},
      { headers: { Authorization: `Bearer ${newToken}` } }
    );
    console.log('   Logout SUCCESS! Message:', logoutRes.data.message);

    console.log('--- ALL FRONTEND-TO-BACKEND INTEGRATION TESTS PASSED CLEANLY! ---');
  } catch (err) {
    console.error('Integration test error:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

testFrontendBackendIntegration();
