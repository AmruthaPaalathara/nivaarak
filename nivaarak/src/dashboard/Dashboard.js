import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Accordion, Spinner, Alert, Button} from 'react-bootstrap';
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import ApplicationSummaryChart from "./UserStatsCharts";
import ApplicationByTypeChart from './UserApplicationCharts';
import DocumentTypeChart from './DocumentTypeChart';
import AdminStatusChart from "./AdminStatusChart";
import UserApplicationsTable from "./UserApplicationTable";
import AdminApplicationsTable from "./AdminApplicationTable";


const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ totalSubmitted: 0, emergencyCount: 0 });
  const [applications, setApplications] = useState([]);
  const [documentStats, setDocumentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(userData?.role === "admin" ? "adminApplications" : "userTable");

  const navigate = useNavigate();

  const getUserRoleFromToken = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.role || null;
    } catch (error) {
      console.error("Invalid token:", error);
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
          API.get(role === "admin" ? "/admin-dashboard/admin-applications" : "/userCharts/user-applications", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        console.log("Profile API Response:", profileRes.data);  // ✅ Debug API
        console.log("Chart API Response:", chartRes.data);

        if (role === "admin") {
          setUserData({ username: "admin", email: "admin@nivaarak.com", role: "admin" });
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

  const handleStatusUpdate = async (appId, status) => {
    try {
      const response = await API.put(`/certificates/update-status/${appId}`, { status });
      if (response.data.success) {
        setApplications(prev => prev.map(app => app._id === appId ? { ...app, status } : app));
      } else {
        alert(response.data.message || "Failed to update status");
      }
    } catch (err) {
      alert("Error updating status: " + (err.response?.data?.message || err.message));
    }
  };

  return (
      <Container fluid className="mt-4">
        <Row>
          <Col md={3} className={`sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>

            {/* Personal Info Section */}
            <Accordion defaultActiveKey="0" className="mb-3">
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

            {/* Sidebar Navigation */}
            <Accordion defaultActiveKey="0">
              <Accordion.Item eventKey="0">
                <Accordion.Header>🏢 Filter by Department</Accordion.Header>
                <Accordion.Body>
                  <ul style={{ listStyleType: "none", padding: 0 }}>
                  <li style={{ cursor: "pointer", padding: "5px" }} onClick={() => setActiveTab("revenue")}>Revenue</li>
                    <li style={{ cursor: "pointer", padding: "5px" }} onClick={() => setActiveTab("education")}>Education</li>
                    <li style={{ cursor: "pointer", padding: "5px" }} onClick={() => setActiveTab("welfare")}>Welfare</li>
                  </ul>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Col>


          <Col md={9}>
            <Card className="shadow-sm p-4">
              <Card.Title>{userData?.role === 'admin' ? 'Admin Dashboard' : 'User Dashboard'}</Card.Title>
              <Card.Body>
                {loading && <Spinner animation="border" />}
                {error && <Alert variant="danger">{error}</Alert>}

                {userData?.role === "admin" ? (
                    <>
                      <AdminStatusChart />
                      <ApplicationByTypeChart
                          title="Applications by Document Type"
                          apiEndpoint="/admin-dashboard/admin-applications"
                      />
                      {/* Applications Overview Section for Admins */}
                      {activeTab === "adminApplications" && (
                          <Card className="mt-4 shadow-sm p-3">
                            <Card.Title>📄 Applications Overview</Card.Title>
                            <Card.Body>
                              {loading && <Spinner animation="border" />}
                              {error && <Alert variant="danger">{error}</Alert>}
                              <AdminApplicationsTable />
                            </Card.Body>
                          </Card>
                      )}
                    </>
                ) : (
                    stats && (
                        <>
                          <ApplicationSummaryChart
                              total={stats.totalSubmitted}
                              emergency={stats.emergencyCount}
                              documentStats={documentStats}
                              role={userData?.role || "user"}
                              chartTitle="Your Application Stats"
                          />

                          {activeTab === "userTable" && <UserApplicationsTable />}{activeTab === "userTable" && <UserApplicationsTable />}

                          {showDrilldown && (
                              <DocumentTypeChart
                                  documentStats={documentStats}
                                  title="Submitted Document Types"
                                  seriesName="Submissions"
                                  height={400}
                              />
                          )}
                        </>
                    )
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
  );
};

export default Dashboard;