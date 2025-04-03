import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import CustomCarousel from "./Carousel";
import About from "./About";

function HomePage() {
    const location = useLocation();

    useEffect(() => {
        if (location.state?.scrollToAbout) {
            setTimeout(() => {
                const aboutSection = document.getElementById('about-section');
                if (aboutSection) {
                    aboutSection.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500); // Delay to allow page to render first
        }
    }, [location]);

    return (
        <>
            <CustomCarousel />
            <About id="about-section" />
        </>
    );
}

export default HomePage;
