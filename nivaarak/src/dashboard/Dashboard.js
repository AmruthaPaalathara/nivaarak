import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Accordion, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import ApplicationSummaryChart from "./UserStatsCharts";
import ApplicationByTypeChart from './UserApplicationCharts';
import DocumentTypeChart from './DocumentTypeChart';
import AdminStatusChart from "./AdminStatusChart";
import UserApplicationsTable from "./UserApplicationTable";
import AdminApplicationsTable from "./AdminApplicationTable";
import DepartmentApplicationsTable from "./DepartmentApplicationsTable";
import StatusApplicationsTable from "./StatusApplicationsTable";

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ totalSubmitted: 0, emergencyCount: 0 });
  const [applications, setApplications] = useState([]);
  const [documentStats, setDocumentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [activeTab, setActiveTab] = useState("userDashboard");
  const navigate = useNavigate();

  const getUserRoleFromToken = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return null;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.role || null;
    } catch (error) {
      console.error("Invalid token format:", error);
      localStorage.removeItem("accessToken");
      navigate("/login");
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return;
    }

    const role = getUserRoleFromToken();
    setActiveTab(role === "admin" ? "adminTable" : "userTable");

    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, chartRes] = await Promise.all([
          role === "admin"
              ? API.get("/admin-dashboard", { headers: { Authorization: `Bearer ${token}` } })
              : API.get("/users/profile", { headers: { Authorization: `Bearer ${token}` } }),
          API.get(role === "admin" ? "/admin-dashboard/admin-applications" : "/userCharts/user-applications", {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (role === "admin") {
          setUserData({ username: "admin", email: "admin@nivaarak.com", role: "admin", phone: "N/A" });
          setApplications(profileRes.data.data);
        } else {
          const user = profileRes.data.data.user;
          setUserData(user);
          setStats({
            totalSubmitted: profileRes.data.data.stats?.totalSubmitted || 0,
            emergencyCount: profileRes.data.data.stats?.emergencyCount || 0
          });
          setDocumentStats(chartRes.data.totalApplications || []);
        }
      } catch (err) {
        console.error("API Fetch Error:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  return (
      <Container fluid className="mt-4">
        <Row>
          {/* Sidebar */}
          <Col md={3}>
            <Accordion defaultActiveKey="info">
              <Accordion.Item eventKey="info">
                <Accordion.Header>👤 Personal Info</Accordion.Header>
                <Accordion.Body>
                  {userData ? (
                      <>
                        <p><strong>Username:</strong> {userData.username}</p>
                        <p><strong>Email:</strong> {userData.email}</p>
                        {userData.phone && <p><strong>Phone:</strong> {userData.phone}</p>}
                        <p><strong>Role:</strong> {userData.role}</p>
                      </>
                  ) : (
                      <p>No user data</p>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>

            <Accordion defaultActiveKey="nav">
              <Accordion.Item eventKey="nav">
                <Accordion.Header>{userData?.role === "admin" ? "Filter Options" : "Submitted Documents"}</Accordion.Header>
                <Accordion.Body>
                  <ul style={{ listStyleType: "none", padding: 0 }}>
                    {userData?.role === "admin" ? (
                        <>
                          <li style={{ cursor: "pointer", padding: "5px" }} onClick={() => setActiveTab("department")}>
                            Filter by Department
                          </li>
                          <li style={{ cursor: "pointer", padding: "5px" }} onClick={() => setActiveTab("status")}>
                            Filter by Status
                          </li>
                          <li style={{ cursor: "pointer", padding: "5px" }} onClick={() => setActiveTab("dashboardOverview")}>
                            Dashboard Overview
                          </li>
                          <li style={{ cursor: "pointer", padding: "5px" }} onClick={() => setActiveTab("adminApplications")}>
                            View All Applications
                          </li>
                        </>
                    ) : (
                        <li style={{ cursor: "pointer", padding: "5px" }} onClick={() => setActiveTab("userTable")}>
                          View Submitted Documents
                        </li>
                    )}
                  </ul>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Col>

          {/* Main Content */}
          <Col md={9}>
            <Card className="shadow-sm p-4">
              <Card.Title>{userData?.role === "admin" ? "Admin Dashboard" : "User Dashboard"}</Card.Title>
              <Card.Body>
                {loading && <Spinner animation="border" />}
                {error && <Alert variant="danger">{error}</Alert>}

                {/* USER VIEW */}
                {userData?.role === "user" && (
                    <>
                      {activeTab !== "userTable" ? (
                          <>
                            <ApplicationSummaryChart
                                total={stats.totalSubmitted}
                                emergency={stats.emergencyCount}
                                documentStats={documentStats}
                                role="user"
                                chartTitle="Your Application Stats"
                            />
                            <Button
                                variant="secondary"
                                onClick={() => setShowDrilldown(prev => !prev)}
                                className="mb-3"
                            >
                              {showDrilldown ? "Hide Document Drilldown" : "Show Document Drilldown"}
                            </Button>
                            {showDrilldown && (
                                <DocumentTypeChart
                                    documentStats={documentStats}
                                    title="Submitted Document Types"
                                    seriesName="Submissions"
                                    height={400}
                                />
                            )}
                          </>
                      ) : (
                          <UserApplicationsTable />
                      )}
                    </>
                )}

                {/* ADMIN VIEW */}
                {userData?.role === "admin" && (
                    <>
                      {activeTab === "dashboardOverview" && (
                          <ApplicationByTypeChart
                              title="Applications by Document Type"
                              apiEndpoint="/admin-dashboard/admin-applications"
                          />
                      )}
                      {activeTab === "department" && <DepartmentApplicationsTable />}
                      {activeTab === "status" && <StatusApplicationsTable />}
                      {activeTab === "adminApplications" && <AdminApplicationsTable />}
                    </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
  );
};

export default Dashboard;
