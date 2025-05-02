import React, { useEffect, useState } from "react";
import API from "../utils/api";
import { Table, Button, Spinner } from "react-bootstrap";

const AdminApplicationsTable = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        API.get("/admin-dashboard/admin-applications", { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                setApplications(res.data.applications);
                setLoading(false);
            })
            .catch(err => console.error("Error fetching admin applications:", err));
    }, []);

    const handleStatusUpdate = async (appId, status) => {
        try {
            await API.put(`/admin-dashboard/update-status/${appId}`, { status });
            setApplications(prev => prev.map(app => app._id === appId ? { ...app, status } : app));
        } catch (err) {
            alert("Error updating status: " + err.message);
        }
    };

    return (
        <>
            {loading ? (
                <Spinner animation="border" />
            ) : (
                <Table striped bordered hover>
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
                    {applications.map((app, index) => (
                        <tr key={app._id}>
                            <td>{index + 1}</td>
                            <td>{app.documentType}</td>
                            <td>{app.applicantName}</td>
                            <td>{app.status}</td>
                            <td>{app.emergencyLevel}</td>
                            <td>{new Date(app.deadline).toLocaleDateString()}</td>
                            <td>
                                <Button variant="success" onClick={() => handleStatusUpdate(app._id, "Approved")}>Approve</Button>
                                <Button variant="danger" onClick={() => handleStatusUpdate(app._id, "Rejected")}>Reject</Button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )}
        </>
    );
};

export default AdminApplicationsTable;