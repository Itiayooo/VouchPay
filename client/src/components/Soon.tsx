export default function Soon({ name }: { name: string }) {
    return (
        <main className="grid min-h-dvh place-items-center p-6">
            <p className="text-mute">{name} is coming next.</p>
        </main>
    );
}