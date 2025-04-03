import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { Form, Button, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import '../css/style.css'; // Import your custom CSS file

function Signin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth(); // Use the login function from AuthContext

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'; // Fallback API URL

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
          const response = await fetch("http://localhost:3001/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
            credentials: "include", // Include cookies if using sessions
          });
      
          const data = await response.json();
      
          if (!response.ok) {
            throw new Error(data.message || "Login failed. Please try again.");
          }
      
          if (data.token && data.userId) {  //  Ensure userId is received
            localStorage.setItem("token", data.token);   // Store token
            localStorage.setItem("userId", data.userId); //  Store userId

            console.log(" User ID stored:", data.userId);
            console.log(" Token stored:", data.token);

      
            // Mark user as authenticated (update your state/context)
            login();
      
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
          if (err.message === "Failed to fetch") {
            setError("Unable to connect to the server. Please check your internet connection.");
          } else {
            setError(err.message || "Invalid username or password. Please try again.");
          }
          setPassword(""); // Clear the password field
        } finally {
          setLoading(false);
        }
      };
    return (
        <Container className="signin-container">
            <Row className="justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <Col xs={12} md={8} lg={6} className="signin-form p-4 shadow rounded bg-light">
                    <h2 className="text-center mb-4">Sign In</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
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

                        <div className="mt-3 text-center">
                            <p>
                                Don't have an account?{' '}
                                <Link to="/registration" className="text-decoration-none" style={{ color: 'black' }}>
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
                    </Form>
                </Col>
            </Row>
        </Container>
    );
}

export default Signin;