import React, { useEffect, useState } from "react";
import API from "../utils/api";
import { Table, Button, Spinner, Modal, Pagination } from "react-bootstrap";

const AdminApplicationsTable = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalText, setModalText] = useState("");
    const [modalTitle, setModalTitle] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const getRowClass = (level) => {
        if (level === "High") return "table-danger";
        if (level === "Medium") return "table-warning";
        if (level === "Low") return "table-info";
        return "";
    };

    useEffect(() => {
        const token = localStorage.getItem("accessToken");

        API.get("/admin-dashboard/all-applications", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                setApplications(res.data.applications || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching admin applications:", err);
                setApplications([]);
                setLoading(false);
            });
    }, []);


    const handleStatusUpdate = async (appId, status) => {
        try {
            await API.put(`/application/priority/update-status/${appId}`, { status });
            setApplications((prev) =>
                prev.map((app) => (app._id === appId ? { ...app, status } : app))
            );
        } catch (err) {
            alert("Error updating status: " + err.message);
        }
    };

    const handleCheckDocuments = async (appId) => {
        try {
            const res = await API.post(`/application/priority/check-documents/${appId}`);
            setModalTitle("Extracted Text Preview");
            setModalText(res.data.text?.slice(0, 1000) || "No text extracted.");
            setShowModal(true);
        } catch (err) {
            const message = err.response?.data?.message || err.message;
            alert("Failed to extract text: " + message);
        }
    };

    const paginatedApps = applications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(applications.length / itemsPerPage);

    return (
        <>
            {loading ? (
                <Spinner animation="border" />
            ) : applications.length === 0 ? (
                <p style={{ textAlign: "center", fontWeight: "bold" }}>No applications found.</p>
            ) : (
                <>
                    <Table striped bordered hover responsive>
                        <thead>
                        <tr>
                            <th>Sl. No</th>
                            <th>Document Type</th>
                            <th>Applicant Name</th>
                            <th>Status</th>
                            <th>Emergency Level</th>
                            <th>Deadline</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {paginatedApps.map((app, index) => (
                            <tr key={app._id} className={getRowClass(app.emergencyLevel)}>
                                <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                <td>{app.documentType?.documentType || "Unknown"}</td>
                                <td>{app.userId?.username || "Unknown"}</td>
                                <td>{app.status || "Pending"}</td>
                                <td>{app.emergencyLevel}</td>
                                <td>{app.requiredBy ? new Date(app.requiredBy).toLocaleDateString() : "N/A"}</td>
                                <td>
                                    <Button variant="info" className="me-2" onClick={() => handleCheckDocuments(app._id)}>
                                        Check
                                    </Button>
                                    <Button variant="success" className="me-2" onClick={() => handleStatusUpdate(app._id, "Approved")}>
                                        Approve
                                    </Button>
                                    <Button variant="danger" onClick={() => handleStatusUpdate(app._id, "Rejected")}>
                                        Reject
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>

                    {/* Pagination */}
                    <Pagination className="justify-content-center">
                        <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)} />
                        {[...Array(totalPages)].map((_, i) => (
                            <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
                                {i + 1}
                            </Pagination.Item>
                        ))}
                        <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)} />
                    </Pagination>
                </>
            )}

            {/* Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{modalTitle}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ whiteSpace: "pre-wrap", maxHeight: "500px", overflowY: "auto" }}>
                    {modalText}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default AdminApplicationsTable;
