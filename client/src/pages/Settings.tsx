import BankSection from '../components/settings/BankSection';
import ProfileSection from '../components/settings/ProfileSection';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
    const { vendor } = useAuth();
    if (!vendor) return null;

    return (
        <div className="grid max-w-[760px] gap-6">
            <div>
                <h1 className="text-[clamp(30px,4.5vw,44px)] font-medium tracking-[-0.05em]">Settings</h1>
                <p className="text-mute">Where you get paid, and the details buyers see.</p>
            </div>
            <BankSection />
            <ProfileSection />
        </div>
    );
}