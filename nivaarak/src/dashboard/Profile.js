import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Accordion, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import UserStatsChart from "./UserStatsCharts";
import DocumentTypeChart from './DocumentTypeChart';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documentStats, setDocumentStats] = useState([]);
  const [showDrilldown, setShowDrilldown] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("No accessToken found. Redirecting to login...");
      navigate("/login");
      return;
    }

    const fetchUserData = async () => {
      setLoading(true);
      setError(null);

      try {
        // ✅ Fetch user profile first
        const response = await API.get("/users/profile");
        const result = response.data;

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch user profile");
        }

        setUserData(result.data.user);

        const total = result.data.stats.totalSubmitted || 0;
        const emergency = result.data.stats.emergencyCount || 0;

        setStats({
          totalSubmitted: total,
          emergencyCount: emergency
        });

        // ✅ Fetch user's submitted applications for drilldown
        const appResponse = await API.get("/charts/user-applications");
        if (appResponse.data.success) {
          setDocumentStats(appResponse.data.totalApplications);
        }

      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleBarClick = (category) => {
    if (category === "Total Applications") {
      setShowDrilldown(true);
    }
  };

  return (
      <Container fluid className="mt-4">
        <Row>
          {/* Sidebar with personal info */}
          <Col md={3}>
            <Accordion defaultActiveKey="0">
              <Accordion.Item eventKey="0">
                <Accordion.Header>👤 Personal Info</Accordion.Header>
                <Accordion.Body>
                  {userData ? (
                      <>
                        <p><strong>Username:</strong> {userData.username}</p>
                        <p><strong>Email:</strong> {userData.email}</p>
                        <p><strong>Phone:</strong> {userData.phone}</p>
                        <p><strong>Role:</strong> {userData.role}</p>
                      </>
                  ) : (
                      <p>No user data</p>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Col>

          {/* Dashboard content */}
          <Col md={9}>
            <Card className="shadow-sm p-4">
              <Card.Title>User Dashboard</Card.Title>
              <Card.Body>
                {loading && <Spinner animation="border" />}
                {error && <Alert variant="danger">{error}</Alert>}
                {stats && (
                    <>
                      <UserStatsChart
                          total={stats.totalSubmitted}
                          emergency={stats.emergencyCount}
                          documentStats={documentStats}
                          onBarClick={handleBarClick}
                      />
                      {showDrilldown && (
                          <DocumentTypeChart documentStats={documentStats} />
                      )}
                    </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
  );
};

export default Profile;
