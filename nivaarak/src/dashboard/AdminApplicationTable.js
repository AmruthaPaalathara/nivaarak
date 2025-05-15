import React, { useEffect, useState } from "react";
import API from "../utils/api";
import { Table, Button, Spinner, Modal, Badge, Container,ButtonGroup, Stack  } from "react-bootstrap";
import { checkApplication } from "../service/verifyService";
import { FaCheck, FaThumbsUp, FaThumbsDown } from "react-icons/fa";

const AdminApplicationsTable = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalText, setModalText] = useState("");
    const [modalTitle, setModalTitle] = useState("");
    const [page, setPage] = useState(1);
    const perPage = 10;
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectModalText, setRejectModalText] = useState("");

    // map emergency level → bootstrap bg + always black text
    const EmergencyBadge = ({ level }) => {
        const variantMap = {
            Low:      "light",
            Medium:   "secondary",
            High:     "warning",
            Critical: "danger",
        };
        const bg = variantMap[level] || "light";
        return (
            <Badge bg={bg} text="dark">
                {level}
            </Badge>
        );
    };

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        API.get("/admin-dashboard/all-applications", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => setApplications(res.data.applications || []))
            .catch(err => console.error("Error fetching admin applications:", err))
            .finally(() => setLoading(false));
    }, []);

    const handleStatusUpdate = async (appId, status) => {
        const token = localStorage.getItem("accessToken");
        console.log('PUT /priority-applications/update-status/', appId, 'body=', { status }, 'token=', token);

        try {
            await API.put(
                `/priority-applications/update-status/${appId}`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setApplications((apps) =>
                apps.map((a) =>
                    a._id === appId ? { ...a, status } : a
                )
            );
        } catch (err) {
            console.error("Status update failed:", err);
            alert("Error updating status");
        }
    };


    const handleCheckDocuments = async (appId) => {
        try {
            const { eligible, mismatchReasons = [], confidence } = await checkApplication(appId);
            const displayConfidence = Number.isFinite(confidence)
                ? `${Math.round(confidence * 100)}%`
                : "N/A";

            if (eligible) {
                setModalTitle("All Good!");
                setModalText(`Eligible (confidence ${Math.round(confidence * 100)}%)`);
            } else {
                setModalTitle("Issues Found:");
                setModalText(mismatchReasons.join("\n"));
            }
            setShowModal(true);
        } catch (err) {
            console.error("Check failed:", err);
            setModalTitle("Error");
            setModalText("Unable to verify at this time.");
            setShowModal(true);
        }
    };

    const handleReject = async (app) => {
        const token = localStorage.getItem("accessToken");
try{
        // 1️⃣  Mark the application rejected
        await API.put(
            `/priority-applications/update-status/${app._id}`,
            { status: "Rejected" },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // 2️⃣  Re-run your verification to get the mismatchReasons array
        const { mismatchReasons } = await checkApplication(app._id);

        // 3️⃣  Generate the rejection PDF

        await API.post(
            '/pdf/generate-pdf',
            {
                userId:          app.applicant,       // numeric userId in your Certificate
                documentType:    app.documentType,    // e.g. "Senior Citizen Certificate"
                rejectionReasons: mismatchReasons   // the array of strings
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // 4️⃣  Send the email
        //     POST /api/email/send-email
        await API.post(
            "/email/send-email",
            {
                email: app.email,
                userId:        app.applicant.userId,      // backend will look up email
                documentType:  app.documentType,
                // you can also pass rejectionReasons here if your template needs it
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // show confirmation
        setRejectModalText(`Rejection email sent to ${app.email}`);
        setShowRejectModal(true);


        // 5️⃣  Update your local state so the UI shows “Rejected”
        setApplications(apps =>
            apps.map(a =>
                a._id === app._id ? { ...a, status: "Rejected" } : a
            )
        );
    } catch (err) {
        console.error("Reject + Notify failed:", err);
        alert("Error rejecting & notifying applicant.");
    }
};

    // pagination
    const totalPages = Math.ceil(applications.length / perPage);
    const slice = applications.slice((page - 1) * perPage, page * perPage);

    if (loading) return <div className="text-center"><Spinner animation="border" /></div>;
    if (!applications.length) return <p style={{ textAlign: "center" }}>No applications found.</p>;

    return (
        <Container fluid>
            <div className="table-responsive">
            <Table striped bordered hover>
                <thead>
                <tr style={{ textAlign:"center"}}>
                    <th>Sl. No</th>
                    <th>Applicant Name</th>
                    <th>Document Type</th>
                    <th>Status</th>
                    <th>Emergency Level</th>
                    <th>Deadline</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {slice.map((app, idx) => (
                    <tr key={app._id} style={{ textAlign:"center"}}>
                        <td>{(page - 1) * perPage + idx + 1}</td>
                        <td>{app.applicantName || "Unknown"}</td>
                        <td>{app.documentTypeName || "Unknown"}</td>
                        <td>{app.status || "Pending"}</td>
                        <td><EmergencyBadge level={app.emergencyLevel || "Low"} /></td>
                        <td>
                            {app.requiredBy
                                ? new Date(app.requiredBy).toLocaleDateString('en-GB')
                                : "N/A"
                            }
                        </td>
                        <td>
                            <Stack direction="horizontal" gap={5} className="justify-content-center">
                                <div className="d-flex flex-column flex-sm-row">
                                    <ButtonGroup className="flex-fill">
                                    <Button
                                        size="sm"
                                        variant="info"
                                        onClick={() => handleCheckDocuments(app._id)}
                                    >
                                        <FaCheck className="me-1" />
                                        Check
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="success"
                                        onClick={() => handleStatusUpdate(app, "Approved")}
                                    >
                                        <FaThumbsUp className="me-1" />
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => handleReject(app)}
                                    >
                                        <FaThumbsDown className="me-1" />
                                        Reject
                                    </Button>
                                    </ButtonGroup>
                                </div>
                            </Stack>
                        </td>
                    </tr>
                ))}
                </tbody>
            </Table>
            </div>

            <div className="d-flex justify-content-between align-items-center my-3">
                <Button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                >
                    ← Previous
                </Button>
                <span>Page {page} of {totalPages}</span>
                <Button
                    disabled={page >= totalPages|| totalPages === 0}
                    onClick={() => setPage(p => p + 1)}
                >
                    Next →
                </Button>
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{modalTitle}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ whiteSpace: "pre-wrap", maxHeight: 400, overflowY: "auto" }}>
                    {modalText}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={showRejectModal}
                onHide={() => setShowRejectModal(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Email Sent</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {rejectModalText}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setShowRejectModal(false)}>
                        OK
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AdminApplicationsTable;
