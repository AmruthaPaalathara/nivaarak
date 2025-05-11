import React, { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Form, Pagination } from 'react-bootstrap';
import API from '../utils/api';

const DepartmentApplicationsTable = () => {
    const [applications, setApplications] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const applicationsPerPage = 10;

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Use selectedDept instead of department
                const res = await API.get(`/admin-dashboard/department-applications?department=${selectedDept}`);
                setApplications(res.data.applications);  // Store fetched applications
            } catch (err) {
                setError('Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedDept]);
  // Dependency on selectedDept


    const filteredApps =
        selectedDept === 'All'
            ? applications
            : applications.filter((app) => app.department === selectedDept);

    const indexOfLastApp = currentPage * applicationsPerPage;
    const indexOfFirstApp = indexOfLastApp - applicationsPerPage;
    const currentApps = filteredApps.slice(indexOfFirstApp, indexOfLastApp);
    const totalPages = Math.ceil(filteredApps.length / applicationsPerPage);

    const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <>
            <Form.Group controlId="departmentSelect" className="mb-3">
                <Form.Label>Filter by Department</Form.Label>
                <Form.Control
                    as="select"
                    value={selectedDept}
                    onChange={(e) => {
                        setSelectedDept(e.target.value);
                        setCurrentPage(1);
                    }}
                >
                    <option>All</option>
                    {departments.map((dept) => (
                        <option key={dept}>{dept}</option>
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
                                <td>{app.applicantName || 'Unknown'}</td>
                                <td>{app.documentType || 'N/A'}</td>
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

export default DepartmentApplicationsTable;
