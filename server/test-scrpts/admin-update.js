// test-scripts/admin-update.js

const axios = require('axios');

async function updateStatus() {
    try {
        const appId = '681090cfb1f8a0e77e785373'; // Replace with real ID
        const res = await axios.put(`http://localhost:3001/api/priority-applications/update-status/${appId}`, {
            status: 'Approved'
        });
        console.log('Status Updated:', res.data);
    } catch (err) {
        console.error(' Error updating status:', err.message);
    }
}

updateStatus();
