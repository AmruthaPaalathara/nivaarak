import React, { useEffect, useState } from "react";
import API from "../utils/api";
import { Table, Spinner, Button } from "react-bootstrap";

const UserApplicationsTable = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const applicationsPerPage = 10;

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        API.get("/userTable/user-applications-table", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => {
                console.log("User Applications Data:", res.data.applications);
                setApplications(res.data.applications || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error("API Error in UserApplicationsTable:", err.response ? err.response.data : err.message);
                setLoading(false);
            });
    }, []);

    const indexOfLastApplication = currentPage * applicationsPerPage;
    const indexOfFirstApplication = indexOfLastApplication - applicationsPerPage;
    const currentApplications = applications.slice(indexOfFirstApplication, indexOfLastApplication);
    const totalPages = Math.ceil(applications.length / applicationsPerPage);

    return (
        <>
            {loading ? (
                <Spinner animation="border" />
            ) : applications.length === 0 ? (
                <p style={{ textAlign: "center", fontWeight: "bold" }}>No applications submitted yet.</p>
            ) : (
                <>
                    <Table striped bordered hover responsive>
                        <thead>
                        <tr>
                            <th>SL.NO</th>
                            <th>Applicant Name</th>
                            <th>Document Type</th>
                            <th>Department</th>
                            <th>Submitted Date</th>
                            <th>Emergency Level</th>
                            <th>Required By Date</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {currentApplications.map((app, index) => (
                            <tr key={app._id || index}>
                                <td>{index + 1 + indexOfFirstApplication}</td>
                                <td>{app.applicantName || "Unknown"}</td>
                                <td>
                                    {typeof app.documentType === "object"
                                        ? app.documentType.documentType
                                        : app.documentType || "No Document Type"}
                                </td>
                                <td>{app.department || "N/A"}</td>
                                <td>{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "N/A"}</td>
                                <td>{app.emergencyLevel || "Normal"}</td>
                                <td>{app.requiredBy ? new Date(app.requiredBy).toLocaleDateString() : "N/A"}</td>
                                <td>{app.status || "Unknown"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>

                    {/* Pagination Controls */}
                    <div className="text-center mt-3">
                        <Button
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage((prev) => prev - 1)}
                        >
                            ← Previous
                        </Button>

                        <span className="mx-3">
                            Page {currentPage} of {totalPages || 1}
                        </span>

                        <Button
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage((prev) => prev + 1)}
                        >
                            Next →
                        </Button>
                    </div>
                </>
            )}
        </>
    );
};

export default UserApplicationsTable;
