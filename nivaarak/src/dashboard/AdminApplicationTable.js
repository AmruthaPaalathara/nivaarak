import React, { useEffect, useState } from "react";
import API from "../utils/api";
import { Table, Button, Spinner, Modal, Badge, Container,ButtonGroup, Stack  } from "react-bootstrap";
import { checkApplication } from "../service/verifyService";
import { FaCheck, FaThumbsUp, FaThumbsDown } from "react-icons/fa";
import {toast} from "react-toastify";



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
    const [rejectionReasonsMap, setRejectionReasonsMap] = useState({});


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

        const getLoggedInUserId = () => {
        try {
            const token = localStorage.getItem("accessToken");
            if (!token) return null;

            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload?.userId || null;
        } catch (err) {
            console.warn("Unable to decode token:", err);
            return null;
        }
    };

    const handleCheckDocuments = async (appId, userQuery) => {
        try {
            const token = localStorage.getItem("accessToken");

            const {data: ragResult} = await API.post("/admin-dashboard/rag/verify-context", {
                applicationId: appId,
                userQuery
            }, {
                headers: {Authorization: `Bearer ${token}`}
            });

            console.log(" Groq RAG Response:", ragResult);

            const aiResponse = ragResult.aiResponse || "";
            const extractedReasons = aiResponse
                .split("\n")
                .filter(line => line.trim().startsWith("*") || line.trim().startsWith("-"))
                .map(line => line.replace(/^[-*]\s*/, "").trim());

            // Store it in rejectionReasonsMap
            setRejectionReasonsMap(prev => ({
                ...prev,
                [appId]: extractedReasons
            }));

            const modalTitle = ragResult.aiResponse.toLowerCase().includes("mismatch")
                ? " Potential Mismatches Found"
                : " Verified - No Major Issues";

            const modalText = ` AI Response:\n${ragResult.aiResponse}`;

            setModalTitle(modalTitle);
            setModalText(modalText);
            setShowModal(true);

        } catch (err) {
            if (err.response) {
                // Backend responded with an error
                console.error("❌ RAG Check failed with response:", {
                    status: err.response.status,
                    data: err.response.data,
                    url: err.response.config?.url
                });

                setModalTitle("❌ Verification Failed");
                setModalText(`Server Error ${err.response.status}: ${err.response.data?.error || "Unknown error from backend"}`);
            } else if (err.request) {
                // Request was made but no response
                console.error("❌ No response from server:", err.request);
                setModalTitle("❌ Network Error");
                setModalText("No response received from the server. Please check your internet or try again.");
            } else {
                // Something else went wrong
                console.error("❌ Unexpected error:", err.message);
                setModalTitle("❌ Error");
                setModalText("AI eligibility verification failed. Please try again.");
            }

            setShowModal(true);
        }
    };

    const handleStatusUpdate = async (appId, status, reasons = []) => {
        const token = localStorage.getItem("accessToken");
        console.log("PUT /api/user/", appId, "/status body=", { status }, "token=", token);

        try {
            const payload = { status };

            if (status === "Rejected") {
                 payload.rejectionReason = reasons.length
                    ? reasons.join("; ")
                    : "Rejected without specific mismatch reason.";
            }

            const response = await API.put(
                `/user/${appId}/status`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            toast.success(response.data.message || "Status updated");
        } catch (err) {
            console.error("Status update failed:", err);
            toast.error("Status update failed");
        }
    };

    const handleReject = async (app) => {
        try {
            const token = localStorage.getItem("accessToken");
            const adminId = getLoggedInUserId();
            const reasons = rejectionReasonsMap[app._id] || [];

            if (!reasons.length) {
                toast.error("No rejection reasons found for this application.");
                return;  //  Stop here to avoid invalid rejection
            }


            const docType = app.documentType?.name || app.documentType || "";

            // ✅ Step 0: Dynamically generate base PDF content using Groq
            const pdfContentResponse = await API.post('/pdf/fetch-content', {
                documentType: docType
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const aiContent = pdfContentResponse.data?.pdfContent || {};

            // ✅ Step 1: Inject RAG rejection reasons into AI-generated content
            const mergedPdfContent = {
                ...aiContent,
                rejectionReasons: reasons,
                resubmissionInformation: {
                    ...(aiContent.resubmissionInformation || {}),
                    Required: reasons
                }
            };

            console.log("📨 About to generate PDF...");
            //  Step 1: Generate rejection PDF
            await API.post('/pdf/generate-pdf', {
                userId: adminId,
                documentType: app.documentType?.name || app.documentType || null,
                rejectionReasons: reasons,
                pdfContent: mergedPdfContent
            }, { headers: { Authorization: `Bearer ${token}` } });

            console.log(" PDF generated");

            console.log(" Sending email with payload:", {
                email: app.email,
                userId: adminId,
                documentType: app.documentType
            });

            console.log("✅ PDF generated. Now sending email...");
            //  Step 2: Send rejection email
            await API.post("/email/send-email", {
                email: app.email,
                userId:adminId,
                documentType: app.documentType,
            }, { headers: { Authorization: `Bearer ${token}` } });

            console.log(" Email sent");

            //  Step 3: Update status only if all succeeded
            await API.put(
                `/priority-applications/update-status/${app._id}`,
                { status: "Rejected", rejectionReason: reasons.join("; ") },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(" Status updated");

            //  Step 4: Update local state
            setApplications(apps =>
                apps.map(a =>
                    a._id === app._id ? { ...a, status: "Rejected" } : a
                )
            );

            setRejectModalText(`Rejection email sent to ${app.email}`);
            setShowRejectModal(true);
        } catch (err) {
            if (err.response) {
                console.error(`Error at step: ${err.response.config.url}`, "Status:", err.response.status, "Body:", err.response.data);
            }
            console.error("Reject + Notify failed:", err);
            alert("Error rejecting & notifying applicant.");
        }
    };

       // 1) Define severity ordering
           const severityRank = { Critical: 1, High: 2, Medium: 3, Low: 4 };

       // 2) Create a sorted copy
           const sortedApps = [...applications].sort((a, b) => {
             // compare severity
                 const sa = severityRank[a.emergencyLevel] || 5;
             const sb = severityRank[b.emergencyLevel] || 5;
             if (sa !== sb) return sa - sb;

                 // if same level, compare deadlines
                     const da = a.requiredBy ? new Date(a.requiredBy) : new Date(8640000000000000);
             const db = b.requiredBy ? new Date(b.requiredBy) : new Date(8640000000000000);
             return da - db;
           });

    // pagination
    const totalPages = Math.ceil(sortedApps.length / perPage);
    const slice = sortedApps.slice((page - 1) * perPage, page * perPage);

    if (loading) return <div className="text-center"><Spinner animation="border" /></div>;
    if (!applications.length) return <p style={{ textAlign: "center" }}>No applications found.</p>;

    const getPromptByType = (type) => {
        const prompts = {
            "Income Certificate": "Check if the income document satisfies eligibility for an income certificate.",
            "Birth Certificate": "Does the document validate the date and place of birth for birth certificate issuance?",
            "Caste Certificate": "Does the document confirm the applicant's caste for caste certificate eligibility?",
            "Domicile Certificate": "Do the attached documents prove the applicant’s residence duration for domicile certificate eligibility?",
            "Senior Citizen Certificate": "Is the applicant age 60 or above based on the document and proof of birthdate?",
            "Property Documents": "Are the attached documents sufficient proof of property ownership and legal possession?",
            "Land Records": "Do the documents validate land ownership, survey number, and rightful possession?",
            "Marriage Certificate": "Do the documents prove marriage legality, including names and date of marriage?",
            "Educational Certificates": "Do the uploaded educational documents verify academic qualifications and institution details?",
            "Pension Documents": "Are the attached documents valid proof of pension eligibility, including age, service, and employment history?",
            "Residence Proof": "Do the documents contain valid proof of residence including address and identification?",
            "Aadhaar Card": "Is the Aadhaar number clearly visible and matched with the applicant’s name and address?",
            "PAN Card": "Does the PAN card contain correct applicant name, PAN number, and photo?",
            "Bank Statement": "Does the bank statement show the required account activity or proof of income as needed?",
            "Salary Slip": "Is the salary mentioned in the document matching the required income range for eligibility?",
            "Identity Proof": "Does the document confirm the applicant’s identity with matching name and photo?",
            "Parent's Identity Proof": "Do the documents contain matching names of parents as per the application?",
            "Parent's Address Proof": "Is the parent's address consistent with the applicant’s details in the application?",
            "Parent's Marriage Certificate": "Does the marriage certificate include the names of both parents clearly?",
            "Employer Details": "Does the document confirm the applicant’s employer name and designation for verification?",
            "Factory Layout Plan": "Is the factory layout document complete and compliant with required planning norms?",
            "Technical Specification": "Are the technical specifications clear and suitable for the intended purpose?",
            "Manufacturer Approval": "Is the manufacturer approval document issued by a valid authority and unexpired?",
            "Electricity Bill": "Does the electricity bill show the current residential address of the applicant?",
            "Rent Agreement": "Is the rent agreement valid, with the applicant listed as a tenant and matching address?",
            "Caste Proof": "Does the document clearly mention the caste category and has the required seal or authority?",
            "School Leaving Certificate": "Does the certificate clearly mention the applicant’s name, DOB, and institution name?",
            "Land Ownership Proof": "Does the document prove ownership or inheritance of the land with survey and patta details?",
            "Other": "Are the supporting documents appropriate and relevant to the selected document type?",
        };
        return prompts[type] || "Check if the user is eligible based on the uploaded document.";
    };


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
                        <ButtonGroup className="flex-fill">
                            {app.status === "Pending" && (
                                <>
                                    <Button
                                        size="sm"
                                        variant="info"
                                        onClick={() => {
                                            const prompt = getPromptByType(app.documentType);
                                            handleCheckDocuments(app._id, prompt).catch(err => console.error(err));
                                        }}
                                    >
                                        <FaCheck className="me-1" />
                                        Check
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="success"
                                        onClick={() => handleStatusUpdate(app._id, "Approved")}
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
                                </>
                            )}

                            {app.status === "Approved" && (
                                <Button size="sm" variant="success" disabled>
                                    <FaThumbsUp className="me-1" />
                                    Approved
                                </Button>
                            )}

                            {app.status === "Rejected" && (
                                <Button size="sm" variant="danger" disabled>
                                    <FaThumbsDown className="me-1" />
                                    Rejected
                                </Button>
                            )}
                        </ButtonGroup>

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
