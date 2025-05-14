import React, { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Button, ButtonGroup, Pagination } from 'react-bootstrap';
import API from '../utils/api';

const StatusApplicationsTable = () => {
    const [applications, setApplications] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const applicationsPerPage = 10;

    const fetchDataByStatus = async (status) => {
        try {
            const token = localStorage.getItem("accessToken");
            const res = await API.get(`/admin-dashboard/status-applications?status=${status}`,
                { headers: { Authorization: `Bearer ${token}` } });
            setApplications(res.data.applications);  // Store fetched applications
        } catch (err) {
            console.error("🚨 Status fetch error:", err);
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
        fetchDataByStatus(selectedStatus);
    }, [selectedStatus]);



    const filteredApps =
        selectedStatus === 'All'
            ? applications
            : applications.filter((app) => app.status === selectedStatus);

    const indexOfLastApp = currentPage * applicationsPerPage;
    const indexOfFirstApp = indexOfLastApp - applicationsPerPage;
    const currentApps = filteredApps.slice(indexOfFirstApp, indexOfLastApp);
    const totalPages = Math.ceil(filteredApps.length / applicationsPerPage);

    const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <>
            <ButtonGroup className="mb-3">
                {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                    <Button
                        key={status}
                        variant={selectedStatus === status ? 'primary' : 'outline-primary'}
                        onClick={() => {
                            setSelectedStatus(status);
                            setCurrentPage(1);
                        }}
                        className="me-2"
                    >
                        {status}
                    </Button>
                ))}
            </ButtonGroup>

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
                            <th>Applicant Name</th>

                            <th>Document Type </th>
                            <th>Department</th>
                            <th>Submitted Date</th>
                            <th>Emergency Level</th>
                            <th>Required By Date</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {currentApps.map((app, index) => (
                            <tr key={app._id}>
                                <td>{index + 1 + indexOfFirstApp}</td>
                                <td>{app.applicantName || 'Unknown'}</td>

                                <td>{app.documentTypeName || app.documentType || 'Unknown'}</td>
                                <td>{app.department || 'Unknown'}</td>
                                <td>
                                    {app.createdAt
                                        ? new Date(app.createdAt).toLocaleDateString()
                                        : 'N/A'}
                                </td>
                                <td>{app.emergencyLevel || 'Normal'}</td>
                                <td>
                                    {app.requiredBy
                                        ? new Date(app.requiredBy).toLocaleDateString()
                                        : 'N/A'}
                                </td>
                                <td>{app.status || 'Pending'}</td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>


                        {/* … your table markup … */}

                        <div className="d-flex justify-content-between mt-3">
                            <Button
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                ← Previous
                            </Button>
                            <span>Page {currentPage} of {totalPages || 1}</span>
                            <Button
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                Next →
                            </Button>
                        </div>
                    </>
            )}
        </>
    );
};

export default StatusApplicationsTable;
