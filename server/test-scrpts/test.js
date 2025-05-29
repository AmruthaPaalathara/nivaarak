const axios = require('axios');
const API = require("../../nivaarak/src/utils/api")
async function testPriorityApplication() {
    try {
        const response = await API.post('/priority-applications/submit', {
            userId: 101,
            certificateType: 'Pension Documents',
            department: "Department of Pension & Pensioners' Welfare",
            isEmergency: true,
        });
        console.log('✅ Server Response:');
        console.log(response.data);
    } catch (error) {
        if (error.response) {
            console.error('❌ Error Response from Server:');
            console.error(error.response.data);
        } else {
            console.error('❌ Error Sending Request:', error.message);
        }
    }
}

testPriorityApplication();