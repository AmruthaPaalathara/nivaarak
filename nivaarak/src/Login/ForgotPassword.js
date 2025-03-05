import React from 'react';
import { FloatingLabel, Form, Button, Container, Row, Col } from 'react-bootstrap';

export default function ForgotPassword() {
    // Define handleSubmit function
    const handleSubmit = (event) => {
        event.preventDefault();
        console.log("Forgot Password form submitted");
    };

    return (
        <Container className="forgot-password-container">
            <Row className="justify-content-center align-items-center">
                <Col xs={12} md={6} lg={4}>
                    <div className="forgot-password-form p-4 shadow rounded">
                        <h2 className="text-center mb-4 form-heading">Forgot Password</h2>
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <FloatingLabel controlId="floatingUsername" label="Username">
                                    <Form.Control type="text" placeholder="Enter your username" required />
                                </FloatingLabel>
                            </Form.Group>
                            <div className="d-flex justify-content-center">
                                <Button type="submit" className="button">Continue</Button>
                            </div>
                        </Form>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}
