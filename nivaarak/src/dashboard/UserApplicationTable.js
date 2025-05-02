import React, { useEffect, useState } from "react";
import API from "../utils/api";
import { Table, Spinner } from "react-bootstrap";

const UserApplicationsTable = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        API.get("userCharts/user-applications", { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                console.log("API Response:", res.data);
                setApplications(res.data.applications || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching applications:", err);
                setApplications([]);  // ✅ Prevents undefined errors
                setLoading(false);
            });
    }, []);

    return (
        <>
            {loading ? (
                <Spinner animation="border" />
            ) : (
                <Table striped bordered hover>
                    <thead>
                    <tr>
                        <th>Document Type</th>
                        <th>Submission Date</th>
                        <th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {applications.map(app => (
                        <tr key={app._id}>
                            <td>{app.documentType}</td>
                            <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                            <td>{app.status}</td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )}
        </>
    );
};

export default UserApplicationsTable;