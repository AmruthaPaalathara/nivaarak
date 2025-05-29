// EmergencyTable.js
import React, { useEffect, useState } from "react";

import { Table, Spinner, Form } from "react-bootstrap";
import API from "../utils/api";

const EmergencyTable = () => {

    const [data, setData]       = useState([]);
    const [loading, setLoading] = useState(true);
    const [raw, setRaw]           = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [level, setLevel]       = useState("All");

    useEffect(() => {
        API.get("/priority-applications/all")
            .then(res => {
                const apps = res.data.applications;           // grab the array
                setData(apps);                                // typo fixed: setData, one paren

                console.log("📥 Raw priority‐applications payload:", apps);
                const emergencies = apps.filter(app =>
                    app.emergencyLevel === "High" ||
                    app.emergencyLevel === "Critical"
                );
                console.log("🔥 fetched emergencies:", emergencies);

                setRaw(emergencies);
                setFiltered(emergencies);
            })
            .catch(err => {
                console.error("Error fetching priority-applications:", err);
            })
            .finally(() => setLoading(false));
    }, []);


    useEffect(() => {
        if (level === "All") {
            setFiltered(raw);
        } else {
            setFiltered(raw.filter(app => app.emergencyLevel === level));
        }
    }, [level, raw]);


      // derive filtered on the fly
           const shown = level === "All"
         ? data
             : data.filter(app => app.emergencyLevel === level);




    return (

        <>
            <Form.Group className="mb-3" controlId="filterLevel">
                <Form.Label>Show emergency level:</Form.Label>
                <Form.Select
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                >
                    <option>All</option>
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                </Form.Select>
            </Form.Group>
            <div className="table-responsive">
        <Table striped bordered hover>
            <thead>
            <tr>
                <th>SL.NO</th>
                <th>Applicant Name</th>
                <th>Document Type</th>
                <th>Priority</th>
                <th>Emergency Level</th>
                <th>Days to Deadline</th>


                <th>Status</th>
            </tr>
            </thead>
            <tbody>
            {data.map((app, idx) => (
                <tr key={app._id}>
                    <td>{idx + 1}</td>                          {/* SL.NO */}
                    <td>{app.applicantName}</td>                {/* Applicant Name */}
                    <td>{app.documentTypeName}</td>             {/* Document Type */}
                    <td>{app.priority}</td>                     {/* Priority */}
                    <td>{app.emergencyLevel}</td>
                    <td>{app.daysToDeadline ?? "—"}</td>        {/* Days to Deadline */}


                    <td>{app.status}</td>                       {/* Status */}
                </tr>
            ))}
            </tbody>

        </Table>
            </div>
            </>
    );
};

export default EmergencyTable;
