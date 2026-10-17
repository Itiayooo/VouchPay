import { Link } from 'react-router-dom';
import { buttonStyles } from '../ui/Button';

export default function BankBanner() {
    return (
        <div className="flex flex-col gap-3 rounded-[22px] bg-sand px-5 py-4 text-amber md:flex-row md:items-center md:justify-between">
            <p>
                <b className="font-bold">Add your bank account to start selling.</b> We pay you there when a buyer confirms,
                and you can't create links until it's set up.
            </p>
            <Link to="/settings" className={`${buttonStyles('dark', 'sm')} shrink-0`}>
                Add bank account
            </Link>
        </div>
    );
}