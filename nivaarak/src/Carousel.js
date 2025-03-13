import React from 'react';
import { Carousel } from 'react-bootstrap';
import caroussel1 from './images/caroussel1.jpg';
import caroussel2 from './images/caroussel2.jpg';
import caroussel3 from './images/caroussel3.jpg';

import './css/style.css'

function CustomCarousel() {
  return (
    <Carousel fade>
      <Carousel.Item>
        <img src={caroussel1} alt="First slide" className="d-block w-85 caroussel-img" />
        <Carousel.Caption>
          <h3 className='caroussel-heading'>Transforming education with AI: Department of School Education, Government of Maharashtra</h3>
          <p>Empowering schools and students through innovative AI-driven initiatives</p>
        </Carousel.Caption>
      </Carousel.Item>
      <Carousel.Item>
        <img src={caroussel2} alt="Second slide" className="d-block w-100 caroussel-img" />
        <Carousel.Caption>
          <h3 className='caroussel-heading'>Empowering HGRI with AI-driven solutions, powered by Google</h3>
          <p>Transforming research and innovation through cutting-edge AI technology</p>
        </Carousel.Caption>
      </Carousel.Item>
      <Carousel.Item>
        <img src={caroussel3} alt="Third slide" className="d-block w-100 caroussel-img" />
        <Carousel.Caption>
          <h3 className='caroussel-heading'>AI driving innovation for HGRIE and CVC CFP initiatives</h3>
          <p>Advancing research and collaboration through AI-powered solutions</p>
        </Carousel.Caption>
      </Carousel.Item>
    </Carousel>
  );
}

export default CustomCarousel;
