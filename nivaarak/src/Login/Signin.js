import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { Form, Button, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import '../css/style.css'; // Import your custom CSS file
import API from "../../src/utils/api";

function Signin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth(); // Use the login function from AuthContext
    const [credentials, setCredentials] = useState({ username: "", password: "" });
    const [fieldErrors, setFieldErrors] = useState([]);

    // const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'; // Fallback API URL

    const location = useLocation();
    useEffect(() => {
        console.log("Current path is now: ", location.pathname);
    }, [location]);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Validate input fields
        if (!username || !password) {
            setError("Username and password are required.");
            setLoading(false);
            return;
        }

        try {
            const response = await API.post("/auth/login",
                { username, password },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    withCredentials: true, // to send cookies like session ID
                });

            const data = response.data;

            if (data.accessToken && data.userId) {  //  Ensure userId is received
                localStorage.setItem("accessToken", data.accessToken);
                // localStorage.setItem("refreshToken", data.refreshToken);
                localStorage.setItem("sessionId", data.sessionId);
                localStorage.setItem("userId", data.userId);


                console.log(" User ID stored:", data.userId);
                console.log("Access Token stored:", data.accessToken);

                // Mark user as authenticated (update your state/context)
                login(data.accessToken, true);

                // Redirect based on user role (optional)
                if (data.role === "admin") {
                    navigate("/admin-dashboard");
                } else {
                    navigate("/"); // Redirect to a default dashboard
                }
            } else {
                setError("Login failed. Please try again.");
            }
        } catch (err) {
            const resp = err.response;
            if (resp?.status === 400 && Array.isArray(resp.data.errors)) {
                // Extract each error.message
                setFieldErrors(resp.data.errors.map(e => e.message));
            } else {
                setFieldErrors([resp?.data?.message || "Something went wrong."]);
            }

        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <Container className="signin-container">
            <Row className="justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <Col xs={12} md={8} lg={6} className="signin-form p-4 shadow rounded bg-light">
                    <h2 className="text-center mb-4">Sign In</h2>
                    {fieldErrors.length > 0 && (
                        <Alert variant="danger">
                            <ul className="mb-0">
                                {fieldErrors.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Username</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength={3}
                                maxLength={20}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </Form.Group>

                        <div className="d-grid">
                            <Button className='button' type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" />
                                        <span className="ms-2">Signing In...</span>
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </div>


                    </Form>

                    <div className="mt-3 text-center">
                        <p>
                            Don't have an account?{' '}
                            <Link to="/registration" className="text-decoration-none" style={{ color: 'black' }} onClick={() => console.log("Link clicked! currentPath:", window.location.pathname)}
                            >
                                Register here
                            </Link>
                        </p>
                        <p>
                            Forgot password?{' '}
                            <Link to="/forgot-password" className='text-decoration-none' style={{ color: 'black' }}>
                                Reset it here
                            </Link>
                        </p>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}

export default Signin;