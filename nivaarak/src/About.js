import React from 'react';
import { Container, Row, Col, Image } from 'react-bootstrap';
import aboutImg from './images/about-img.svg';  
import './css/style.css'


function About() {
  return (
    <Container>
      <Row className="d-flex justify-content-center align-items-center mb-5">
        <Col xs={12} md={4}>
          <div id="about-section" className="about-section">
            Our AI-powered government portal is designed to streamline the process of applying for official certificates,
            making it easier and more efficient for applicants. Instead of waiting in long queues or dealing with lengthy approval times,
            users can submit their requests online, and the AI system will automatically check their eligibility based on the required criteria.
            Applicants can also track the status of their certificates in real-time, ensuring transparency and reducing uncertainty.
          </div>
        </Col>
        <Col xs={12} md={4}>
          <div className="about-section">
            For those whose applications are rejected, the portal includes an intelligent chatbot with voice assistance to provide clear
            explanations for the rejection. It helps users understand the specific issues with their application and offers guidance on
            possible corrections or additional documents needed for resubmission. By simplifying the entire process, this system ensures a
            hassle-free experience, reduces unnecessary delays, and improves accessibility for everyone.
          </div>
        </Col>
        <Col xs={12} md={4}>
          <div className="about-img">
            <Image alt="AI-powered image" src={aboutImg} fluid />
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default About;
