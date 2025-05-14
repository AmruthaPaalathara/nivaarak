// src/dashboard/DepartmentApplicationsTable.js
import React, { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Form, Button, Badge } from 'react-bootstrap';
import API from '../utils/api';

const EmergencyBadge = ({ level }) => {
    const variantMap = {
        Low:      'dark',
        Medium:   'secondary',
        High:     'warning',
        Critical: 'danger'
    };
    const variant = variantMap[level] || 'secondary';
    return <Badge bg={variant}>{level}</Badge>;
};

const DepartmentApplicationsTable = () => {
    const [applications, setApplications] = useState([]);
    const [departments,  setDepartments]  = useState([]);
    const [selectedDept, setSelectedDept] = useState('All');
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);
    const [page,         setPage]         = useState(1);
    const perPage = 10;

    // 1️⃣ Fetch the list of all departments
    useEffect(() => {
        API.get('/admin-dashboard/departments')
            .then(res => setDepartments(res.data.departments || []))
            .catch(() => {/* ignore */});
    }, []);

    // 2️⃣ Fetch the applications whenever selectedDept changes
    useEffect(() => {
        setLoading(true);
        setError(null);
        API.get(`/admin-dashboard/department-applications?department=${selectedDept}`)
            .then(res => {
                setApplications(res.data.applications || []);
            })
            .catch(() => {
                setError('Failed to fetch applications.');
            })
            .finally(() => {
                setLoading(false);
                setPage(1);
            });
    }, [selectedDept]);

    // Filtering & pagination
    const filtered = (selectedDept === 'All')
        ? applications
        : applications.filter(a => a.department === selectedDept);

    const totalPages = Math.ceil(filtered.length / perPage);
    const start = (page - 1) * perPage;
    const current = filtered.slice(start, start + perPage);

    return (
        <>
            <Form.Group className="mb-3">
                <Form.Label>Filter by Department</Form.Label>
                <Form.Control
                    as="select"
                    value={selectedDept}
                    onChange={e => setSelectedDept(e.target.value)}
                >
                    <option>All</option>
                    {departments.map(d => (
                        <option key={d}>{d}</option>
                    ))}
                </Form.Control>
            </Form.Group>

            {loading ? (
                <Spinner animation="border" />
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : (
                <>
                    <Table striped bordered hover responsive>
                        <thead>
                        <tr>
                            <th>SL.NO</th>
                            <th>Applicant</th>
                            <th>Document Type</th>
                            <th>Department</th>
                            <th>Submitted</th>
                            <th>Emergency</th>
                            <th>Required By</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {current.map((app, i) => (
                            <tr key={app._id}>
                                <td>{start + i + 1}</td>
                                <td>{app.applicantName
                                    ? app.applicantName
                                    : `${app.firstName || ""} ${app.lastName || ""}`.trim() || "Unknown"}
                                </td>
                                <td>{app.documentType}</td>
                                <td>{app.department}</td>
                                <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                                <td><EmergencyBadge level={app.emergencyLevel} /></td>
                                <td>{new Date(app.requiredBy).toLocaleDateString()}</td>
                                <td>{app.status}</td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>

                    <div className="d-flex justify-content-between">
                        <Button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            ← Previous
                        </Button>
                        <span className="align-self-center">
              Page {page} of {totalPages || 1}
            </span>
                        <Button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next →
                        </Button>
                    </div>
                </>
            )}
        </>
    );
};

export default DepartmentApplicationsTable;
