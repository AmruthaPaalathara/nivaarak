const axios = require('axios');

async function getAllPriorityApplications() {
    try {
        const res = await axios.get('http://localhost:3001/api/priority-applications/all');
        console.log('📋 All Priority Applications:');
        res.data.data.forEach((app, i) => {
            console.log(`\n#${i + 1} - ${app.certificateType}`);
            console.log(`User: ${app.userId}`);
            console.log(`Priority: ${app.priority}`);
            console.log(`Emergency: ${app.isEmergency ? '✅ YES' : 'No'}`);
            console.log(`Status: ${app.status}`);
        });
    } catch (err) {
        console.error('❌ Failed to fetch applications:', err.message);
    }
}

getAllPriorityApplications();
