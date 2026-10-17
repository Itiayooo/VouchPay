import FeeCalculator from '../components/landing/FeeCalculator';
import Faq from '../components/landing/Faq';
import FinalCta from '../components/landing/FinalCta';
import Footer from '../components/landing/Footer';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import Nav from '../components/landing/Nav';
import Platforms from '../components/landing/Platforms';
import Problem from '../components/landing/Problem';
import WhoItsFor from '../components/landing/WhoItsFor';

export default function Landing() {
    return (
        <>
            <Nav />
            <Hero />
            <Problem />
            <HowItWorks />
            <WhoItsFor />
            <Platforms />
            <FeeCalculator />
            <Faq />
            <FinalCta />
            <Footer />
        </>
    );
}