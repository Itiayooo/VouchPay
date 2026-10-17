export default function FormError({ message }: { message: string }) {
    if (!message) return null;
    return (
        <div role="alert" className="rounded-btn bg-alert-bg px-4 py-3 text-[15px] text-alert">
            {message}
        </div>
    );
}