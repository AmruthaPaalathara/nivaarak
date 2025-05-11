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
            const res = await API.get(`/admin-dashboard/status-applications?status=${status}`);
            setApplications(res.data.applications);  // Store fetched applications
        } catch (err) {
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataByStatus(selectedStatus);  // Fetch data when the status changes
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
                            <th>Document Type</th>
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
                                <td>{app.userId?.username || "Unknown"}</td>
                                <td>{app.documentType?.documentType || "Unknown"}</td>
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

                    <Pagination className="justify-content-center">
                        {[...Array(totalPages)].map((_, idx) => (
                            <Pagination.Item
                                key={idx + 1}
                                active={idx + 1 === currentPage}
                                onClick={() => handlePageChange(idx + 1)}
                            >
                                {idx + 1}
                            </Pagination.Item>
                        ))}
                    </Pagination>
                </>
            )}
        </>
    );
};

export default StatusApplicationsTable;
