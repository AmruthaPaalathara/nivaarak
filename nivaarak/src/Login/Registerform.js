import React, { useState } from 'react';
import { FloatingLabel, Form, Button, Container, Row, Col } from 'react-bootstrap';
import '../style.css';
import axios from 'axios';

function Registerform() {
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log({ first_name, last_name, username, email, password });
    axios.post('http://localhost:3001/registration', { first_name, last_name, username, email, password })
    .then(result => console.log(result))
    .catch(err => console.log(err));
  };

  return (
    <Container className="register-container">
      <Row className="justify-content-center">
        <Col xs={12} md={6}>
          <div className='registrationform border p-3 shadow'>
            <h2 className="text-center mb-4 form-heading">Register</h2>
           
            <Form onSubmit={handleSubmit}>
              <FloatingLabel controlId="floatingFirstName" label="First Name" className="mb-3 mt-2 border">
                <Form.Control 
                  type="text" 
                  placeholder="First Name" 
                  required 
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </FloatingLabel>
              <FloatingLabel controlId="floatingLastName" label="Last Name" className="mb-3">
                <Form.Control 
                  type="text" 
                  placeholder="Last Name" 
                  required 
                  onChange={(e) => setLastName(e.target.value)}
                />
              </FloatingLabel>
              <FloatingLabel controlId="floatingUsername" label="Username" className="mb-3">
                <Form.Control 
                  type="text" 
                  placeholder="Username" 
                  required 
                  onChange={(e) => setUsername(e.target.value)}
                />
              </FloatingLabel>
              <FloatingLabel controlId="floatingEmail" label="Email" className="mb-3">
                <Form.Control 
                  type="email" 
                  placeholder="Email" 
                  required 
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FloatingLabel>
              <FloatingLabel controlId="floatingPassword" label="Password" className="mb-3">
                <Form.Control 
                  type="password" 
                  placeholder="Password" 
                  required 
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FloatingLabel>
              <div className='d-flex justify-content-center'>
                <Button type="submit" className='button'>Register</Button>
              </div>
            </Form>
           
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default Registerform;
