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
import EmergencyTable from "./AdminEmergencyTable";

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
  const [role, setRole]           = useState(null);
  const [userDocs, setUserDocs] = useState([]);


  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return;
    }
    let payload;
    try {
      payload = JSON.parse(atob(token.split(".")[1]));
    } catch {
      localStorage.removeItem("accessToken");
      navigate("/login");
      return;
    }
    setRole(payload.role);                              // store it in state
    setActiveTab(payload.role === "admin"
        ? "dashboardOverview"
        : "userTable"
    );
  }, [navigate]);



  // 2️⃣  Now fetch data once we know the role:
  useEffect(() => {
    if (!role) return;  // wait until role is decoded

    const token = localStorage.getItem("accessToken");
    setLoading(true);

    (async () => {
      try {
        if (role === "admin") {
          // — Admin: only hit the admin endpoints
          // (this one is unprotected so no 403)
          await API.get("/admin-dashboard", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const chartRes = await API.get("/admin-dashboard/admin-applications", {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserData({   // immediately set admin info
            username: "admin",
            email:    "admin@nivaarak.com",
            phone:    "N/A",
            role:     "admin"
          });
          setApplications(chartRes.data.data);

        } else {
          // — User: only hit the user endpoints
          const [profileRes, chartRes] = await Promise.all([
            API.get("/users/profile", {
              headers: { Authorization: `Bearer ${token}` }
            }),
            API.get("/userCharts/user-applications", {
              headers: { Authorization: `Bearer ${token}` }
            })
          ]);
          const user = profileRes.data.data.user;
          setUserData(user);
          setStats({
            totalSubmitted: profileRes.data.data.stats.totalSubmitted,
            emergencyCount: profileRes.data.data.stats.emergencyCount
          });
          setDocumentStats(chartRes.data.totalApplications);
        }
      } catch (err) {
        console.error("API Fetch Error:", err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);

  return (
      <Container fluid className="mt-4">
        <Row>
          {/* Sidebar */}
          <Col md={3}>
            <Accordion defaultActiveKey="info" className="mb-3">
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

            <Accordion defaultActiveKey="nav" className="mb-3">
              <Accordion.Item eventKey="nav">
                <Accordion.Header>
                  {role === "admin" ? "Filter Options" : "Submitted Documents"}
                </Accordion.Header>
                <Accordion.Body>
                  <ul style={{ listStyleType: "none", padding: 0 }}>
                    {role === "admin" ? (
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

                          <li
                              style={{ cursor: "pointer", padding: "5px" }}
                              onClick={() => setActiveTab("emergency")}
                          >
                            Filter by Emergency
                          </li>

                        </>
                    ) : (
                        <>
                          <li
                              style={{ cursor: "pointer", padding: "5px" }}
                              onClick={() => setActiveTab("userTable")}
                          >
                            View Submitted Documents
                          </li>
                          <li
                              style={{ cursor: "pointer", padding: "5px" }}
                              onClick={() => setActiveTab("userDashboard")}
                          >
                            View My Stats
                          </li>
                          <li
                              style={{ cursor: "pointer", padding: "5px" }}
                              onClick={() => setActiveTab("typeChart")}
                          >
                            View Applications by Type
                          </li>
                        </>
                    )}
                  </ul>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>

          </Col>

          {/* Main Content */}
          <Col md={9}>
            <Card className="shadow-sm p-4">
              <Card.Title>{role === "admin" ? "Admin Dashboard" : "User Dashboard"}</Card.Title>
              <Card.Body>
                {loading && <Spinner animation="border" />}
                {error && <Alert variant="danger">{error}</Alert>}

                {/* USER VIEW */}
                {userData?.role === "user" && (
                    <>
                      {/* Submitted Documents Table */}
                      {activeTab === "userTable" && (
                          <UserApplicationsTable />
                      )}

                      {/* Summary + Drilldown Chart */}
                      {activeTab === "userDashboard" && (
                          <>
                            <ApplicationSummaryChart
                                total={stats.totalSubmitted}
                                emergency={stats.emergencyCount}
                                documentStats={documentStats}
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
                      )}

                      {/* Applications by Type Chart */}
                      {activeTab === "typeChart" && (
                          <ApplicationByTypeChart
                              title="Applications by Certificate Type"
                              apiEndpoint="/userCharts/user-applications"
                          />
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
                      {activeTab === "emergency" && <EmergencyTable />}
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
