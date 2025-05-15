// EmergencyTable.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Spinner } from "react-bootstrap";

const EmergencyTable = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios
            .get("/api/priority-applications")        // or your filtered endpoint
            .then(res => {
                // only keep emergency ones
                const emergencies = res.data.data.filter(app => app.isEmergency);
                setData(emergencies);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Spinner animation="border" />;

    return (
        <Table striped bordered hover>
            <thead>
            <tr>
                <th>#</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Days to Deadline</th>
                <th>Past Apps</th>
                <th>Discrepant?</th>
                <th>Status</th>
            </tr>
            </thead>
            <tbody>
            {data.map((app, idx) => (
                <tr key={app._id}>
                    <td>{idx + 1}</td>
                    <td>{app.certificateType}</td>
                    <td>{app.priority}</td>
                    <td>{app.daysToDeadline != null ? app.daysToDeadline : "—"}</td>
                    <td>{app.pastApplications}</td>
                    <td>{app.isDiscrepant ? "⚠️" : "OK"}</td>
                    <td>{app.status}</td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
};

export default EmergencyTable;
