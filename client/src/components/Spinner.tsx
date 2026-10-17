export default function Spinner() {
    return (
        <div className="grid min-h-dvh place-items-center">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-forest" role="status" aria-label="Loading" />
        </div>
    );
}