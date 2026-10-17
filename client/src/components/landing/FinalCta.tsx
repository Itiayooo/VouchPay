import { Link } from 'react-router-dom';
import { useCreateLinkPath } from '../../lib/useCreateLinkPath';
import { buttonStyles } from '../ui/Button';
import Container from './Container';

export default function FinalCta() {
    const createPath = useCreateLinkPath();

    return (
        <div className="diamonds mx-3 rounded-[36px] py-[84px] text-center md:mx-auto md:w-[min(1240px,100%_-_32px)]">
            <Container>
                <h2 className="text-[clamp(40px,8vw,84px)] tracking-[-0.05em] text-ink">
                    Sell with proof.
                    <em className="mx-auto mt-1 block w-fit px-3.5 not-italic [background:linear-gradient(transparent_62%,#fff_62%)]">
                        Buy with peace.
                    </em>
                </h2>
                <div className="mt-9 flex flex-wrap justify-center gap-3">
                    <Link to={createPath} className={`${buttonStyles('dark')} max-w-[320px] flex-[1_1_230px]`}>
                        Create an escrow link
                    </Link>
                    <Link to="/track" className={`${buttonStyles('outline')} max-w-[320px] flex-[1_1_230px]`}>
                        Have a link? Track your order
                    </Link>
                </div>
            </Container>
        </div>
    );
}