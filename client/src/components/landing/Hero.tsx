import { Link } from 'react-router-dom';
import { useCreateLinkPath } from '../../lib/useCreateLinkPath';
import { buttonStyles } from '../ui/Button';
import Container from './Container';
import Stairs from './Stairs';

export default function Hero() {
    const createPath = useCreateLinkPath();

    return (
        <header className="relative overflow-hidden bg-wash pt-11 pb-[235px] text-center md:pt-16 md:pb-[130px]">
            {/* faint vertical lines, fading out from the headline */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-1/2 h-[calc(100%_-_290px)] w-full -translate-x-1/2 [background:repeating-linear-gradient(90deg,transparent_0_9px,#D2EAD9_9px_10px)] [mask-image:radial-gradient(ellipse_62%_72%_at_50%_38%,#000_20%,transparent_100%)] md:h-[calc(100%_-_40px)] md:w-[min(640px,42vw)]"
            />
            <div aria-hidden="true" className="diamonds absolute inset-x-0 bottom-0 h-[190px] md:h-[130px]" />

            <div className="pointer-events-none absolute bottom-[30px] left-[-10vw] z-[1] w-[min(54vw,400px)] md:bottom-9 md:left-[-5vw] md:w-[min(30vw,400px)]">
                <Stairs kind="check" />
            </div>
            <div className="pointer-events-none absolute right-[-10vw] bottom-[30px] z-[1] w-[min(54vw,400px)] scale-x-[-1] md:right-[-5vw] md:bottom-9 md:w-[min(30vw,400px)]">
                <Stairs kind="lock" />
            </div>
            <div
                aria-hidden="true"
                className="absolute bottom-3.5 left-[25vw] z-[1] hidden h-[84px] w-[84px] rounded-full bg-[#C9CBF6] md:block"
                style={{ boxShadow: 'inset -10px 0 0 #6C6FD1', transform: 'scaleX(.72) rotate(-18deg)' }}
            />
            <div
                aria-hidden="true"
                className="absolute right-[24vw] bottom-[22px] z-[1] hidden h-[72px] w-[72px] rounded-full bg-[#D9F8E3] md:block"
                style={{ boxShadow: 'inset 10px 0 0 #6BE38A', transform: 'scaleX(.72) rotate(14deg)' }}
            />

            <div className="relative z-[2]">
                <Container>
                    <h1 className="text-[clamp(40px,10.5vw,88px)] leading-[.96] font-medium tracking-[-0.055em]">
                        Pay safe. Get paid.
                        <br />
                        <span className="highlight">No wahala.</span>
                    </h1>
                    <p className="mx-auto mt-[26px] mb-[34px] max-w-[28em] text-[clamp(18px,2.3vw,22px)] text-mute">
                        VouchPay holds the buyer's money and only releases it to the seller when the buyer says "I got it." Works
                        on Instagram, WhatsApp, Jiji, anywhere you sell.
                    </p>
                    <div className="mb-[22px] inline-block rounded-xl bg-forest px-[18px] py-[11px] text-[15.5px] leading-[1.35] font-semibold text-white">
                        Works on Instagram, WhatsApp, Jiji, X, Telegram and face to face
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link to={createPath} className={`${buttonStyles('primary')} max-w-[320px] flex-[1_1_230px]`}>
                            Create an escrow link
                        </Link>
                        <Link to="/track" className={`${buttonStyles('outline')} max-w-[320px] flex-[1_1_230px]`}>
                            Have a link? Track your order
                        </Link>
                    </div>
                    <p className="mt-[18px] text-[14.5px] text-mute">
                        Free to start. VouchPay is in test mode, so we're onboarding early sellers now.
                    </p>
                </Container>
            </div>
        </header>
    );
}