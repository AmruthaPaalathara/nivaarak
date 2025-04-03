import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import '../css/style.css';

const Profile = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Fetch user details (Example API call)
    const fetchUserData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/user/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`, // Ensure token is sent
          },
        });
    
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
    
        const data = await response.json();
        console.log('User Data:', data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
    
  }, []);

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg p-4">
            <Card.Body>
              <h3 className="mb-4">User Profile</h3>
              {userData ? (
                <>
                  <p><strong>Username:</strong> {userData.username}</p>
                  <p><strong>Email:</strong> {userData.email}</p>
                  <p><strong>Certificates Applied:</strong> {userData.appliedCertificates}</p>
                  <p><strong>Approved:</strong> {userData.approvedCertificates}</p>
                  <p><strong>Rejected:</strong> {userData.rejectedCertificates}</p>
                </>
              ) : (
                <p>Loading user data...</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;
