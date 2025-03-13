
import React from 'react';
import { FloatingLabel, Form, Button, Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import '../css/style.css';

function Signin() {
    //Handle form submission
    const handleSubmit = (event) => {
        event.preventDefault();
        console.log("Form submitted");
        // Add authentication logic here
    };

    return (
        <Container className="login-container">
            <Row className="justify-content-center align-items-center">
                <Col xs={12} md={6} lg={4}>
                    <div className="loginform p-4 shadow rounded">
                        <h2 className="text-center mb-4 form-heading">Sign In</h2>
                        {/* Form starts here */}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <FloatingLabel controlId="floatingUsername" label="Username">
                                    <Form.Control type="text" placeholder="Username" required />
                                </FloatingLabel>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <FloatingLabel controlId="floatingPassword" label="Password">
                                    <Form.Control type="password" placeholder="Password" required />
                                </FloatingLabel>
                            </Form.Group>
                            <div className="d-flex justify-content-between">
                                <Link to="/registration" className="create-account text-start">Don't have an Account? <p>Create Account</p></Link>
                                
                                    <Link to="/forgot-password" className="forgot-password text-end mt-0">Forgot Password?</Link>
                                </div>
                    
                            <div className="d-flex justify-content-center">
                                <Button type="submit" className="button">Sign In</Button>
                            </div>
                        </Form>
                        {/* Form ends here */}
                    </div>
                </Col>
            </Row>
        </Container>
    );
}

export default Signin;
